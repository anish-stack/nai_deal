const ListingUser = require('../models/User.model'); // Adjust the path as per your project structure
const sendEmail = require('../utils/SendEmail');
const sendToken = require('../utils/SendToken');
const Listing = require('../models/listing.model');

require('dotenv').config()
const Cloudinary = require('cloudinary').v2;

const crypto = require('crypto');
const axios = require('axios')
const Plans = require('../models/Pacakge')
const nodemailer = require('nodemailer');
const Payment = require('../models/PaymentDetails')

const { StatusCodes } = require('http-status-codes');
const Partner = require('../models/Partner.model')
const { validationResult } = require('express-validator');
const authService = require('../Service/authService');
const paymentService = require('../Service/paymentService');
const Package = require('../models/Pacakge');
const CouponModel = require('../models/Coupon.model');
const SendWhatsapp = require('../utils/Sendwhatsapp');
const { markUserPaid, isOrderPaidAtRazorpay } = require('./payment.controller');
Cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY
});
// Create a new ListingUser

/**
 * Register a shop user.
 *
 * Key fix: every branch that creates a Razorpay order now PERSISTS the order
 * id on the user document (and stamps the user id into the order notes).
 * Previously the "existing user" branches created an order and threw the id
 * away, so payment verification could never find the account and the user was
 * asked to pay forever.
 */
exports.ListUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(StatusCodes.BAD_REQUEST)
                .json({ success: false, errors: errors.array() });
        }

        const {
            UserName, Email, ContactNumber, ShopName,
            ShopAddress, ShopCategory, ListingPlan,
            HowMuchOfferPost, Password, LandMarkCoordinates, gstNo, couponCode
        } = req.body;

        // ---- basic input guards ------------------------------------------
        if (!UserName || !ShopName || !Password || !ListingPlan) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'UserName, ShopName, Password and ListingPlan are required'
            });
        }
        if (String(Password).length < 6) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        const normalisedEmail = Email ? String(Email).trim().toLowerCase() : undefined;
        const normalisedNumber = ContactNumber ? String(ContactNumber).trim() : undefined;

        // ---- coupon: only honour it if it is active AND unexpired ---------
        let couponDiscount = 0;
        if (couponCode) {
            const coupon = await CouponModel.findOne({ code: couponCode });
            if (!coupon) {
                return res.status(StatusCodes.BAD_REQUEST)
                    .json({ success: false, message: 'Invalid coupon code' });
            }
            if (!coupon.active || new Date(coupon.expiryDate) <= new Date()) {
                return res.status(StatusCodes.BAD_REQUEST)
                    .json({ success: false, message: 'This coupon has expired or is no longer active' });
            }
            couponDiscount = coupon.discount;
        }

        // ---- partner attribution (optional) -------------------------------
        // A missing/expired partner token must not block a public signup; the
        // listing is simply recorded without a partner.
        let PartnerId = null;
        const token = authService.extractToken(req);
        if (token) {
            const decoded = await authService.verifyToken(token);
            PartnerId = decoded && decoded.id ? decoded.id : null;
        }

        const isFreePlan = String(ListingPlan).trim().toLowerCase().startsWith('free');

        const welcomeMessage = `Hi ${UserName}! \n\n` +
            `Welcome to NaiDeal.com. We're excited to assist you!\n` +
            `After registration please post your offer from your dashboard panel.\n\n` +
            `NaiDeal.com Team`;

        // ---- existing account? --------------------------------------------
        const orConditions = [];
        if (normalisedEmail) orConditions.push({ Email: normalisedEmail });
        if (normalisedNumber) orConditions.push({ ContactNumber: normalisedNumber });
        orConditions.push({ UserName: String(UserName).trim() });

        const existingUser = await ListingUser.findOne({ $or: orConditions });

        if (existingUser) {
            // Already fully paid up - nothing to sell them here.
            if (existingUser.PaymentDone === true && !isFreePlan
                && existingUser.ListingPlan === ListingPlan) {
                return res.status(StatusCodes.CONFLICT).json({
                    success: false,
                    message: 'An account already exists with these details and is active. Please log in.'
                });
            }

            // Before charging again, check whether their last order was in fact paid.
            if (existingUser.OrderId && !existingUser.PaymentDone) {
                const remote = await isOrderPaidAtRazorpay(existingUser.OrderId);
                if (remote.paid) {
                    await markUserPaid({
                        orderId: existingUser.OrderId,
                        paymentId: remote.payment ? remote.payment.id : undefined,
                        amount: remote.order ? remote.order.amount : undefined,
                    });
                    return res.status(StatusCodes.CONFLICT).json({
                        success: false,
                        message: 'Your earlier payment was found and confirmed. Please log in.'
                    });
                }
            }

            if (isFreePlan) {
                existingUser.PaymentDone = true;
                existingUser.FreeListing = 'Free Listing';
                existingUser.ListingPlan = ListingPlan;
                await existingUser.save();
                try { await SendWhatsapp(normalisedNumber || existingUser.ContactNumber, welcomeMessage); } catch (e) { /* non-fatal */ }
                return sendToken(existingUser, res, 200);
            }

            // Paid plan for an existing unpaid/upgrading account: make an order
            // AND remember it against the account.
            const order = await paymentService.createOrder(
                ListingPlan,
                existingUser.UserName,
                couponDiscount,
                { shopUserId: String(existingUser._id) }
            );

            existingUser.OrderId = order.id;
            existingUser.ListingPlan = ListingPlan;
            existingUser.PaymentDone = false;
            await existingUser.save();

            try { await SendWhatsapp(normalisedNumber || existingUser.ContactNumber, welcomeMessage); } catch (e) { /* non-fatal */ }

            return res.status(StatusCodes.OK).json({
                success: true,
                order,
                key: paymentService.getPublicKey(),
                userId: existingUser._id
            });
        }

        // ---- new account ---------------------------------------------------
        const plan = await Package.findOne({ packageName: ListingPlan });
        if (!plan) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `Listing plan "${ListingPlan}" was not found. Please pick a valid plan.`
            });
        }

        const lng = Number(ShopAddress && ShopAddress.ShopLongitude);
        const lat = Number(ShopAddress && ShopAddress.ShopLatitude);
        const hasCoords = Number.isFinite(lng) && Number.isFinite(lat);

        const formattedShopAddress = {
            City: ShopAddress && ShopAddress.City,
            PinCode: ShopAddress && ShopAddress.PinCode,
            ShopAddressStreet: ShopAddress && ShopAddress.ShopAddressStreet,
            ShopNo: ShopAddress && ShopAddress.ShopNo,
            NearByLandMark: ShopAddress && ShopAddress.NearByLandMark,
        };
        if (hasCoords) {
            formattedShopAddress.Location = { type: 'Point', coordinates: [lng, lat] };
        }

        // Accept either a GeoJSON object or a bare [lng, lat] pair, and drop
        // anything malformed rather than letting a cast error 500 the signup.
        let landmark;
        if (LandMarkCoordinates && Array.isArray(LandMarkCoordinates.coordinates)
            && LandMarkCoordinates.coordinates.length === 2) {
            landmark = { type: 'Point', coordinates: LandMarkCoordinates.coordinates.map(Number) };
        } else if (Array.isArray(LandMarkCoordinates) && LandMarkCoordinates.length === 2) {
            landmark = { type: 'Point', coordinates: LandMarkCoordinates.map(Number) };
        } else if (hasCoords) {
            landmark = { type: 'Point', coordinates: [lng, lat] };
        }

        const userData = {
            UserName: String(UserName).trim(),
            Email: normalisedEmail,
            ContactNumber: normalisedNumber,
            ShopName,
            ShopAddress: formattedShopAddress,
            ShopCategory: ShopCategory || undefined,
            ListingPlan,
            ProfilePic: `https://ui-avatars.com/api/?name=${encodeURIComponent(UserName)}&background=random`,
            HowMuchOfferPost: Number(HowMuchOfferPost) || 0,
            PackagePlanIssued: Number(plan.postsDone) || 0,
            Password,
            PartnerId: PartnerId || undefined,
            gstNo,
        };
        if (landmark) userData.LandMarkCoordinates = landmark;

        // Free plan: activate immediately, no gateway round trip.
        if (isFreePlan) {
            userData.PaymentDone = true;
            userData.FreeListing = 'Free Listing';

            const newUser = new ListingUser(userData);
            await newUser.save();

            if (PartnerId) {
                newUser.PartnerCredited = true;
                await newUser.save();
                await Partner.findByIdAndUpdate(PartnerId, { $inc: { PartnerDoneListing: 1 } });
            }

            try { await SendWhatsapp(normalisedNumber, welcomeMessage); } catch (e) { /* non-fatal */ }

            return res.status(StatusCodes.CREATED).json({
                success: true,
                message: 'User created successfully',
                user: newUser
            });
        }

        // Paid plan: save the user first so we have an id for the order notes,
        // then attach the order id. If order creation fails we roll the user
        // back so a retry is not blocked by a duplicate-key error.
        const newUser = new ListingUser(userData);
        await newUser.save();

        let order;
        try {
            order = await paymentService.createOrder(
                ListingPlan,
                newUser.UserName,
                couponDiscount,
                { shopUserId: String(newUser._id) }
            );
        } catch (orderError) {
            await ListingUser.findByIdAndDelete(newUser._id);
            console.error('Order creation failed, rolled back user:', orderError.message);
            return res.status(StatusCodes.BAD_GATEWAY).json({
                success: false,
                message: 'Could not start the payment. Please try again in a moment.'
            });
        }

        newUser.OrderId = order.id;
        await newUser.save();

        try { await SendWhatsapp(normalisedNumber, welcomeMessage); } catch (e) { /* non-fatal */ }

        return res.status(StatusCodes.OK).json({
            success: true,
            order,
            key: paymentService.getPublicKey(),
            userId: newUser._id
        });

    } catch (error) {
        console.error('Error in ListUser:', error);

        if (error && error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'detail';
            return res.status(StatusCodes.CONFLICT).json({
                success: false,
                message: `An account with this ${field} already exists.`
            });
        }
        if (error && error.name === 'ValidationError') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Internal Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.getListingByUserName = async (req, res) => {
    try {
        const { UserName } = req.params;
        const user = await ListingUser.findOne({ UserName });
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({
            success: true,
            message: "User found successfully",
            data: user
        })
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

exports.getSingleListingUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await ListingUser.findById(id).populate('PartnerId').populate('OrderId').
            populate('PackagePlanIssued').populate('HowMuchOfferPost').populate('ShopCategory');
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'User not found' });
        }
        return res.status(StatusCodes.OK).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}

exports.updateShopAddress = async (req, res) => {
    const { userId } = req.params; // Assuming you pass the user ID as a URL parameter
    const { ShopAddress, LandMarkCoordinates } = req.body; // Expecting ShopAddress in the request body

    if (!ShopAddress) {
        return res.status(400).json({
            success: false,
            message: "ShopAddress is required.",
        });
    }
    if (!LandMarkCoordinates) {
        return res.status(400).json({
            success: false,
            message: "LandMarkCoordinates is required.",
        });
    }

    // Validate required fields in ShopAddress
    const { City, PinCode, ShopAddressStreet, ShopNo, NearByLandMark, ShopLongitude, ShopLatitude } = ShopAddress;

    if (!PinCode || !ShopAddressStreet || !ShopNo || !NearByLandMark || !ShopLongitude || !ShopLatitude) {
        return res.status(400).json({
            success: false,
            message: "All required fields in ShopAddress must be provided.",
        });
    }

    // Format ShopAddress
    const formattedShopAddress = {
        City: City || null,
        PinCode,
        ShopAddressStreet,
        ShopNo,
        NearByLandMark,
        Location: {
            type: 'Point',
            coordinates: [ShopLongitude, ShopLatitude],
        },
    };

    try {
        // Find the user by ID
        const user = await ListingUser.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // Update ShopAddress
        user.ShopAddress = formattedShopAddress;
        user.LandMarkCoordinates = LandMarkCoordinates;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "ShopAddress updated successfully.",
            data: user.ShopAddress,
        });
    } catch (error) {
        console.error("Error updating ShopAddress:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating ShopAddress.",
        });
    }
};

exports.addBussinessHours = async (req, res) => {
    try {

        const user = req.user.id

        const { BussinessHours } = req.body;

        if (
            !BussinessHours ||
            typeof BussinessHours !== "object" ||
            !BussinessHours.openTime ||
            !BussinessHours.closeTime ||
            !BussinessHours.offDay
        ) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'BussinessHours must be an object containing openTime, closeTime, and offDay.',
            });
        }

        // Update the business hours for the shop
        const shop = await ListingUser.findByIdAndUpdate(
            user,
            { $set: { BussinessHours } },
            { new: true }
        );

        // If shop not found, return a 404 response
        if (!shop) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Shop not found',
            });
        }

        // Respond with success and updated shop data
        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Business hours updated successfully',
            data: shop,
        });
    } catch (error) {
        // Handle errors and respond with 500
        console.error('Error updating business hours:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'An error occurred while updating business hours.',
            error: error.message,
        });
    }
};


exports.UploadProfileImage = async (req, res) => {
    try {
        // Get the user ID from the request
        const user = req.user.id;

        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const checkShop = await ListingUser.findById(user);
        if (!checkShop) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false
            });
        }

        // Check if a file was uploaded
        const file = req.file;
        if (!file || Object.keys(file).length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Upload image to Cloudinary and wait for result
        const uploadResult = await new Promise((resolve, reject) => {
            Cloudinary.uploader.upload_stream(
                {
                    folder: `profile_images`,
                    public_id: `profile_${user}`,
                    overwrite: true,
                    transformation: { width: 300, height: 300, crop: 'fill' }
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject('Error uploading image to Cloudinary');
                    }
                    resolve(result);
                }
            ).end(file.buffer);
        });

        // Update the user's profile picture URL
        checkShop.ProfilePic = uploadResult.secure_url;
        await checkShop.save();

        // Return the result with Cloudinary image details
        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Profile image uploaded successfully',
            data: {
                public_id: uploadResult.public_id,
                url: uploadResult.secure_url
            }
        });

    } catch (error) {
        console.error('Error uploading profile image:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Error uploading profile image'
        });
    }
};


exports.UpdateProfileDetails = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if the user is authorized
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        // Find the user's shop details
        const checkShop = await ListingUser.findById(userId);
        if (!checkShop) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Shop not found'
            });
        }

        // Destructure the fields from the request body
        const { ShopName, UserName, Email, ContactNumber, gstNo, ShopCategory } = req.body;
        console.log(req.body)
        // Prepare an object for the updated fields
        const updatedFields = {};

        // **Check for duplicate contact number, email, and username (excluding current user)**
        const existingNumber = await ListingUser.findOne({ ContactNumber, _id: { $ne: userId } });
        const existingEmail = await ListingUser.findOne({ Email, _id: { $ne: userId } });
        const existingUserName = await ListingUser.findOne({ UserName, _id: { $ne: userId } });
        if (existingNumber) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Contact number already exists'
            });
        }
        if (existingEmail) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Email already exists'
            });
        }
        if (existingUserName) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'User Name already exists'
            });
        }

        // Check and add fields to be updated
        if (ShopName && ShopName !== checkShop.ShopName) {
            updatedFields.ShopName = ShopName;
        }
        if (UserName && UserName !== checkShop.UserName) {
            updatedFields.UserName = UserName;
        }
        if (Email && Email !== checkShop.Email) {
            updatedFields.Email = Email;
        }
        if (ContactNumber && ContactNumber !== checkShop.ContactNumber) {
            updatedFields.ContactNumber = ContactNumber;
        }
        if (gstNo && gstNo !== checkShop.gstNo) {
            updatedFields.gstNo = gstNo;
        }
        if (ShopCategory && ShopCategory !== checkShop.ShopCategory) {
            updatedFields.ShopCategory = ShopCategory;
        }

        // console.log("shopcategory",)


        // If no fields were updated, return a response
        if (Object.keys(updatedFields).length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'No fields have been updated.'
            });
        }

        // Update the shop details with the new values
        const updatedShop = await ListingUser.findByIdAndUpdate(userId, updatedFields, { new: true });

        // Respond with the updated shop details
        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedShop
        });

    } catch (error) {
        console.error(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Something went wrong while updating the profile.'
        });
    }
};


exports.getAllShops = async (req, res) => {
    try {
        const shops = await ListingUser.find();
        if (shops.length === 0) {
            return res.status(404).json({ message: 'No shops found' });
        }
        res.status(200).json(shops);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Legacy route kept for compatibility - delegates to the shared payment
 * controller so there is exactly ONE verification implementation.
 *
 * The old version hardcoded the key secret as a string literal, so the moment
 * .env moved to a different (or live) key the HMAC never matched and every
 * payment reported "Payment verification failed".
 */
exports.paymentVerification = require('./payment.controller').paymentVerificationRedirect;

// Login a ListingUser
/**
 * Shop user login.
 *
 * The "already paid but still asked to pay" bug lived here: the old code
 * created a brand new Razorpay order and never stored its id on the user, so
 * verification could never match the payment back to the account. It also
 * never re-checked whether the previous order had in fact been paid.
 *
 * Now: self-heal first, and only fall back to a new order if Razorpay
 * confirms nothing has been paid - with the order id persisted this time.
 */
exports.LoginListUser = async (req, res) => {
    try {
        const { any, Password } = req.body;

        if (!any || !Password) {
            return res.status(StatusCodes.BAD_REQUEST)
                .json({ success: false, message: 'Please enter your username/email/phone and password' });
        }

        const identifier = String(any).trim();

        const user = await ListingUser.findOne({
            $or: [
                { Email: identifier.toLowerCase() },
                { UserName: identifier },
                { ContactNumber: identifier }
            ]
        });

        // Same message for "no such user" and "wrong password" so the login
        // form can't be used to discover which accounts exist.
        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED)
                .json({ success: false, message: 'Invalid credentials' });
        }

        const isPasswordMatch = await user.comparePassword(Password);
        if (!isPasswordMatch) {
            return res.status(StatusCodes.UNAUTHORIZED)
                .json({ success: false, message: 'Invalid credentials' });
        }

        if (user.PaymentDone === false) {
            // --- SELF-HEAL -------------------------------------------------
            // Before asking for money again, ask Razorpay whether the last
            // order was actually paid. This is what rescues every account
            // currently stuck in the "pay again" loop.
            if (user.OrderId) {
                const remote = await isOrderPaidAtRazorpay(user.OrderId);
                if (remote.paid) {
                    const healed = await markUserPaid({
                        orderId: user.OrderId,
                        paymentId: remote.payment ? remote.payment.id : undefined,
                        amount: remote.order ? remote.order.amount : undefined,
                    });
                    return await sendToken(healed || user, res, 200);
                }
            }

            // Genuinely unpaid - issue a fresh order AND remember its id.
            let order;
            try {
                order = await paymentService.createOrder(
                    user.ListingPlan,
                    user.UserName,
                    0,
                    { shopUserId: String(user._id) }
                );
            } catch (orderError) {
                console.error('Could not create retry order at login:', orderError.message);
                return res.status(StatusCodes.BAD_GATEWAY).json({
                    success: false,
                    message: 'Your payment is pending but we could not start the checkout. Please try again shortly.'
                });
            }

            user.OrderId = order.id;
            await user.save();

            return res.status(StatusCodes.OK).json({
                success: true,
                paymentPending: true,
                message: 'Payment Pending Please Pay First',
                order,
                key: paymentService.getPublicKey(),
                user: {
                    _id: user._id,
                    UserName: user.UserName,
                    Email: user.Email,
                    ContactNumber: user.ContactNumber,
                    ListingPlan: user.ListingPlan
                }
            });
        }

        return await sendToken(user, res, 200);

    } catch (error) {
        console.error('Error logging in user:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ success: false, message: 'Internal server error' });
    }
};

exports.CreateForgetPasswordRequest = async (req, res) => {
    try {
        const { ContactNumber, newPassword } = req.body;

        // Check if required fields are missing
        if (!ContactNumber || !newPassword) {
            return res.status(403).json({
                success: false,
                msg: "Please Fill All Fields"
            });
        }

        // Find user by email (assuming Email is unique)
        const user = await ListingUser.findOne({ ContactNumber });

        // If user not found, handle accordingly
        if (!user) {
            return res.status(404).json({
                success: false,
                msg: "User not found"
            });
        }

        const generateOtp = () => {
            const otpLength = 6;
            const otp = Math.random().toString().substr(2, otpLength); // Generate random OTP
            return otp;
        };

        const otp = generateOtp();


        const otpExpiryTime = new Date();
        otpExpiryTime.setMinutes(otpExpiryTime.getMinutes() + 10);


        user.PasswordChangeOtp = otp;
        user.newPassword = newPassword
        user.OtpExipredTme = otpExpiryTime;
        await user.save();

        const message = `Hello ${user.ShopName},
        You have requested a password change. Please use the following OTP to proceed:
        ${otp}
        This OTP is valid for 10 minutes. Please use it within this time frame.
        If you did not request this change, please ignore this email.
        Thank you,
        Nai Deal
        `;

        await SendWhatsapp(user.ContactNumber, message);

        res.status(200).json({
            success: true,
            msg: 'OTP sent successfully'
        });

    } catch (error) {
        console.error('Error in forget password request:', error);
        res.status(500).json({
            success: false,
            msg: 'Internal server error'
        });
    }
};
exports.verifyOtp = async (req, res) => {
    try {
        const { PasswordChangeOtp, ContactNumber } = req.body;

        // Check if the email exists in ListingUser
        const user = await ListingUser.findOne({ ContactNumber });

        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }

        // Check if the provided OTP matches and is not expired
        if (user.PasswordChangeOtp !== PasswordChangeOtp) {
            return res.status(400).json({ success: false, msg: 'Invalid OTP' });
        }

        // Check if OTP has expired
        const currentTimestamp = new Date().getTime();
        if (user.OtpExipredTme && currentTimestamp > user.OtpExipredTme.getTime()) {
            return res.status(400).json({ success: false, msg: 'OTP has expired' });
        }

        // Update user's password
        const newPassword = user.newPassword;
        user.Password = newPassword;
        user.newPassword = null
        user.PasswordChangeOtp = null;
        user.OtpExipredTme = null;

        // Save user
        await user.save();

        // Respond with success message
        res.status(200).json({ success: true, msg: 'Password updated successfully' });

    } catch (error) {
        console.error('Error verifying OTP and updating password:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};


// Update details of a ListingUser
exports.updateDetailsOfListUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Find user by ID and update
        const updatedUser = await ListingUser.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User details updated', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Request to change password with OTP for a ListingUser
exports.PasswordChangeRequestOzfListUser = async (req, res) => {
    try {
        const { UserName } = req.body;

        // Find user by username
        const user = await ListingUser.findOne({ UserName });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate OTP for password change request
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.PasswordChangeOtp = otp;
        await user.save();

        // Send email with OTP
        const mailOptions = {
            email: user.UserName,
            subject: 'Password Change OTP',
            message: `
                <div style="font-family: Arial, sans-serif; text-align: center;">
                    <h2>Hello ${user.UserName},</h2>
                    <p>Your OTP for password change request is:</p>
                    <h3 style="color: #4CAF50;">${otp}</h3>
                    <p>This OTP is valid for 5 minutes.</p>
                    <p>If you did not request this change, please ignore this email.</p>
                    <p>Best Regards,<br>Your Company Name</p>
                </div>
            `
        };
        await sendEmail(mailOptions);

        res.status(200).json({ message: 'Password change OTP sent successfully. Check your email.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Render OTP of ListingUser
exports.RenderedOtpOfListUser = async (req, res) => {
    try {
        const { UserName } = req.body;

        // Find user by username
        const user = await ListingUser.findOne({ UserName });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Rendered OTP successfully', otp: user.PasswordChangeOtp });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all ListingUsers
exports.getAllListUsers = async (req, res) => {
    try {
        const users = await ListingUser.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Delete a ListingUser
exports.DeleteListUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Find user by ID and delete
        const deletedUser = await ListingUser.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete all posts associated with the user
        await Listing.deleteMany({ ShopId: id });

        res.status(200).json({ message: 'User and their posts deleted successfully', user: deletedUser });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//get My Details 
exports.MyShopDetails = async (req, res) => {
    try {
        // Assuming req.user.id is set correctly
        const MyShop = req.user.id;
        // console.log('User ID:', MyShop);

        // Finding the shop details based on the user ID
        const CheckMyShop = await ListingUser.findById(MyShop).populate('ShopCategory', 'CategoriesName').select('-Password');
        // console.log('Shop Details:', CheckMyShop);

        if (!CheckMyShop) {
            return res.status(404).json({ message: 'Shop not found' });
        }

        // Returning the shop details
        res.status(200).json({ message: 'User Shop Details retrieved successfully', user: CheckMyShop });

    } catch (error) {
        // Handling errors and sending a response
        res.status(500).json({ message: error.message });
    }
};

//Create-Post For Shop Listing
exports.CreatePost = async (req, res) => {
    try {
        const ShopId = req.user.id;

        if (!ShopId) {
            return res.status(401).json({
                success: false,
                msg: "Please Login"
            });
        }

        const CheckMyShop = await ListingUser.findById(ShopId).select('-Password');
        if (!CheckMyShop) {
            return res.status(404).json({
                success: false,
                msg: "Shop not found"
            });
        }

        const { ListingPlan, HowMuchOfferPost, PackagePlanIssued } = CheckMyShop;
        if (HowMuchOfferPost >= PackagePlanIssued) {
            return res.status(403).json({
                success: false,
                msg: `You have reached the post limit for your ${ListingPlan} plan. Please upgrade your plan.`
            });
        }
        const Plans = await Package.findOne({ packageName: ListingPlan });
        if (!Plans) {
            return res.status(404).json({
                success: false,
                msg: `No package found for plan: ${ListingPlan}`
            });
        }

        if (HowMuchOfferPost >= Plans.postsDone) {
            return res.status(403).json({
                success: false,
                msg: `You have reached the post limit for your ${ListingPlan} plan. Please upgrade your plan.`
            });
        }

        const { Title, Details, HtmlContent, tags } = req.body;
        console.log(req.body)
        const Items = [];

        // Process Items and their dishImages
        const itemsMap = {};
        req.files.forEach(file => {
            const match = file.fieldname.match(/Items\[(\d+)\]\.dishImages\[(\d+)\]/);
            if (match) {
                const [_, itemIndex, imageIndex] = match;
                if (!itemsMap[itemIndex]) {
                    itemsMap[itemIndex] = { dishImages: [] };
                }
                itemsMap[itemIndex].dishImages.push(file);
            }
        });

        // Upload images to Cloudinary
        const uploadToCloudinary = async (file) => {
            return new Promise((resolve, reject) => {
                Cloudinary.uploader.upload_stream({
                    folder: 'your_upload_folder' // Adjust folder as per your setup
                }, (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ public_id: result.public_id, ImageUrl: result.secure_url });
                    }
                }).end(file.buffer);
            });
        };

        // Process items with dishImages
        for (const index of Object.keys(itemsMap)) {
            const item = itemsMap[index];
            const uploadedImages = await Promise.all(item.dishImages.map(file => uploadToCloudinary(file)));

            // Calculate AfterDiscountPrice
            const MrpPrice = parseFloat(req.body[`Items[${index}].MrpPrice`]) || 0;
            const Discount = parseFloat(req.body[`Items[${index}].Discount`]) || 0;
            const AfterDiscountPrice = (MrpPrice - (MrpPrice * (Discount / 100))).toFixed(2);

            Items.push({
                itemName: req.body[`Items[${index}].itemName`],
                MrpPrice: MrpPrice.toString(),
                Discount: Discount,
                AfterDiscountPrice: AfterDiscountPrice.toString(),
                dishImages: uploadedImages
            });
        }

        // Process general images
        const uploadedGeneralImages = await Promise.all(req.files
            .filter(file => file.fieldname === 'images')
            .map(file => uploadToCloudinary(file)));
        console.log(tags); // Logs the tags string, e.g., "#FoodInrohini, #ometotindia"

        const splitTags = tags.split(',').map(tag => tag.trim());
        console.log(splitTags);
        const newPost = await Listing.create({
            Title,
            Details,
            Items,
            tags: splitTags,
            HtmlContent,
            Pictures: uploadedGeneralImages,
            ShopId,
        });

        CheckMyShop.HowMuchOfferPost += 1;
        await CheckMyShop.save();
        // console.log(newPost)
        res.status(201).json({
            success: true,
            msg: "Post created successfully",
            post: newPost
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            msg: "Error creating post",
            error: error.message
        });
    }
};


exports.getAllPost = async (req, res) => {
    try {
        // Fetch all listings from the database
        const listings = await Listing.find();

        // If no listings found, return an error response
        if (listings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No listings found.',
            });
        }

        // Fetch all ShopDetails to categorize by plan type
        const shopDetails = await ListingUser.find();

        // If no shopDetails found, handle accordingly
        if (shopDetails.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No shop details found.',
            });
        }

        // Categorize listings by plan type
        let goldListings = [];
        let silverListings = [];
        let freeListings = [];

        listings.forEach(listing => {
            const foundShopDetails = shopDetails.find(sd => sd._id.toString() === listing.ShopId.toString());
            if (!foundShopDetails) return; // Skip if shop details not found

            if (foundShopDetails.ListingPlan === 'Gold') {
                goldListings.push({
                    listing,
                    shopDetails: foundShopDetails
                });
            } else if (foundShopDetails.ListingPlan === 'Silver') {
                silverListings.push({
                    listing,
                    shopDetails: foundShopDetails
                });
            } else if (foundShopDetails.ListingPlan === 'Free') {
                freeListings.push({
                    listing,
                    shopDetails: foundShopDetails
                });
            }
        });

        // Shuffle the arrays to introduce randomness
        shuffleArray(goldListings);
        shuffleArray(silverListings);
        shuffleArray(freeListings);

        // Initialize counters for each type of listing
        let shuffledListings = []
        let goldCount = 0;
        let silverCount = 0;
        let freeCount = 0;

        for (let i = 0; i < listings.length; i++) {
            // Check if there are gold listings left to show and less than 2 gold posts have been added
            if (goldCount < goldListings.length && goldCount < 2) {
                // Push the next gold listing into shuffledListings
                shuffledListings.push(goldListings[goldCount]);
                goldCount++;
            } else if (silverCount < silverListings.length && silverCount < 2) {
                // Push the next silver listing into shuffledListings
                shuffledListings.push(silverListings[silverCount]);
                silverCount++;
            } else {
                // Push the next free listing into shuffledListings
                shuffledListings.push(freeListings[freeCount]);
                freeCount++;
            }
        }

        // Handle remaining gold and silver listings if any
        while (goldCount < goldListings.length) {
            shuffledListings.push(goldListings[goldCount]);
            goldCount++;
        }

        while (silverCount < silverListings.length) {
            shuffledListings.push(silverListings[silverCount]);
            silverCount++;
        }

        // Handle remaining free listings if any
        while (freeCount < freeListings.length) {
            shuffledListings.push(freeListings[freeCount]);
            freeCount++;
        }

        // console.log(shuffledListings)
        // Return successful response with shuffled listings
        return res.status(200).json({
            success: true,
            count: shuffledListings.length,
            data: shuffledListings,
        });
    } catch (error) {
        console.error('Error fetching listings:', error);
        // Return error response if there's a server error
        return res.status(500).json({
            success: false,
            error: 'Server error. Could not fetch listings.',
        });
    }
};
exports.getAllPostApprovedPost = async (req, res) => {
    try {
        const { location, address } = req.query || {};
        const parsedLocation = location ? JSON.parse(location) : null;
        const parsedAddress = address ? JSON.parse(address) : null;

        let listings = [];

        if (!parsedLocation) {
            listings = await Listing.find({ isApprovedByAdmin: true }).populate('ShopId');
            return res.status(200).json({
                success: true,
                count: listings.length,
                data: listings.reverse(),
            });
        }

        const coordinates = [parseFloat(parsedLocation.longitude), parseFloat(parsedLocation.latitude)];
        console.log(coordinates)
        if (isNaN(coordinates[0]) || isNaN(coordinates[1])) {
            return res.status(400).json({
                success: false,
                error: 'Invalid latitude or longitude provided.',
            });
        }

        const findData = await ListingUser.find({
            LandMarkCoordinates: {
                $nearSphere: {
                    $geometry: { type: "Point", coordinates },
                    $maxDistance: 5000,
                },
            },
        });

        if (!findData.length) {
            console.log("findData", findData.length)
            listings = await Listing.find({ isApprovedByAdmin: true }).populate('ShopId');
        } else {
            const findDataIds = findData.map(data => data._id.toString());
            listings = await Listing.find({ isApprovedByAdmin: true, ShopId: { $in: findDataIds } }).populate('ShopId');

        }

        console.log("listings.length", listings.length)
        return res.status(200).json({
            success: true,
            count: listings.length,
            data: listings.reverse(),
        });
    } catch (error) {
        console.error('Error fetching listings:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error. Could not fetch listings.',
        });
    }
};



exports.getAllPostApprovedPostByAddress = async (req, res) => {
    try {
        const { address } = req.query || {};
        const parsedAddress = address ? JSON.parse(address) : null;

        let listings = [];

        if (!parsedAddress) {
            listings = await Listing.find({ isApprovedByAdmin: true }).populate('ShopId');
            return res.status(200).json({
                success: true,
                count: listings.length,
                data: listings.reverse(),
            });
        }

        const City = parsedAddress.city.toLowerCase();

        const findData = await ListingUser.find({
            'ShopAddress.City': { $regex: new RegExp(City, 'i') } // Case-insensitive and partial match
        });

        if (!findData.length) {
            listings = await Listing.find({ isApprovedByAdmin: true }).populate('ShopId');
        } else {
            const findDataIds = findData.map(data => data._id.toString());
            listings = await Listing.find({ isApprovedByAdmin: true, ShopId: { $in: findDataIds } }).populate('ShopId');
        }

        return res.status(200).json({
            success: true,
            count: listings.length,
            data: listings.reverse(),
        });
    } catch (error) {
        console.error('Error fetching listings:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error. Could not fetch listings.',
        });
    }
};




function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}




exports.deletePostById = async (req, res) => {
    try {
        const listingId = req.params.id;
        const listing = await Listing.findById(listingId);

        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }
        console.log(listing)
        // Delete associated images from Cloudinary
        const deleteImage = async (public_id) => {
            try {
                return await Cloudinary.uploader.destroy(public_id);
            } catch (error) {
                console.error(`Error deleting image with public_id ${public_id}:`, error);
                // You can choose to throw an error or continue based on your needs
                throw error;
            }
        };
        await Promise.all(listing.Pictures.map(pic => deleteImage(pic.public_id)));
        const ShopInfo = await ListingUser.findById(listing.ShopId);

        if (!ShopInfo) {
            return res.status(403).json({
                success: false,
                msg: "Shop Not Available"
            });
        } else {
            ShopInfo.HowMuchOfferPost -= 1;
            await ShopInfo.save(); // Save the updated ShopInfo
            await listing.deleteOne(); // Delete the listing
        }

        res.status(200).json({ success: true, message: 'Listing deleted successfully' });
    } catch (error) {
        console.error('Error deleting listing:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.deleteAllPost = async (req, res) => {
    try {
        const listings = await Listing.find();

        if (listings.length === 0) {
            return res.status(404).json({ success: false, message: 'No listings found to delete' });
        }

        // Delete associated images from Cloudinary
        const deleteImage = async (public_id) => {
            return Cloudinary.uploader.destroy(public_id);
        };

        await Promise.all(
            listings.flatMap(listing => listing.Pictures.map(pic => deleteImage(pic.public_id)))
        );

        await Listing.deleteMany();
        res.status(200).json({ success: true, message: 'All listings deleted successfully' });
    } catch (error) {
        console.error('Error deleting all listings:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.getPostById = async (req, res) => {
    try {
        const listingId = req.params.id;
        const listing = await Listing.findById(listingId);

        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        const shopDetails = await ListingUser.findById(listing.ShopId).populate('ShopCategory').select('-password');

        if (!shopDetails) {
            return res.status(404).json({ success: false, message: 'Shop details not found' });
        }

        // Combine listing data with shopDetails
        const listingWithShopDetails = {
            ...listing._doc,
            shopDetails,
        };

        res.status(200).json({ success: true, data: listingWithShopDetails });
    } catch (error) {
        console.error('Error fetching listing:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.getMyPostOnly = async (req, res) => {
    try {
        const ShopId = req.user.id || req.query.id;
        const listings = await Listing.find({ ShopId });

        if (listings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No listings found for this shop.',
            });
        }

        return res.status(200).json({
            success: true,
            count: listings.length,
            data: listings,
        });

    } catch (error) {
        console.error('Error fetching listings:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error. Could not fetch listings.',
        });
    }
};

exports.getMyAllPost = async (req, res) => {
    try {
        // Extract ShopId from query parameters
        const ShopId = req.query.id;

        // Query listings based on ShopId, or fetch all if no ShopId is provided
        const query = ShopId ? { ShopId } : {};
        const listings = await Listing.find(query);

        if (listings.length === 0) {
            return res.status(404).json({
                success: false,
                message: ShopId
                    ? 'No listings found for this shop.'
                    : 'No listings found.',
            });
        }

        return res.status(200).json({
            success: true,
            count: listings.length,
            data: listings,
        });

    } catch (error) {
        console.error('Error fetching listings:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error. Could not fetch listings.',
        });
    }
};


exports.SearchByPinCodeCityAndWhatYouWant = async (req, res) => {
    try {
        const { City, WhatYouWant, searchType, PinCode, ShopCategory } = req.body.formData;

        // console.log("Query:", req.body.formData);

        if (searchType === 'advanced') {
            // First, find listings with matching City and ShopCategory
            const AdvancedListingShopData = await ListingUser.find({ 'ShopAddress.City': City, ShopCategory });
            console.log("AdvancedListingShopData", AdvancedListingShopData);

            // Extracting ids from AdvancedListingShopData
            const AdvancedlistingShopIds = AdvancedListingShopData.map(listing => listing._id);

            // Construct an array of regex patterns for each word in the query (case insensitive)
            const titleRegex = new RegExp(`.*${WhatYouWant.split('').join('.*')}.*`, 'i');

            // Find listings with matching ShopId and titles matching the regex pattern
            const AdvancedfetchPost = await Listing.find({
                ShopId: { $in: AdvancedlistingShopIds },
                Title: { $regex: titleRegex }
            });
            console.log(AdvancedfetchPost)
            // Combine ListingShopData with fetchPost entries
            const AdvancedshuffledListings = AdvancedfetchPost.map(post => {
                const shopDetails = AdvancedListingShopData.find(shop => shop._id.toString() === post.ShopId.toString());
                return { ...post.toObject(), ShopDetails: shopDetails };
            });

            // Shuffle the combined listings based on specified criteria (assuming shuffleListings is defined and correctly implemented)
            shuffleListings(AdvancedshuffledListings);

            // Respond with the shuffled listings including both ListingShopData and fetchPost
            res.status(200).json({ listings: AdvancedshuffledListings });
        } else {
            // Regular search by City and WhatYouWant
            const ListingShopData = await ListingUser.find({ 'ShopAddress.City': City });

            // Extracting ids from ListingShopData
            const listingShopIds = ListingShopData.map(listing => listing._id);

            // Construct an array of regex patterns for each word in the query (case insensitive)
            const wordRegexes = WhatYouWant.split(' ').map(word => new RegExp(`\\b${word}\\b`, 'i'));

            // Find listings with matching ShopId and titles matching the regex pattern
            const fetchPost = await Listing.find({
                ShopId: { $in: listingShopIds },
                $and: wordRegexes.map(regex => ({ Title: { $regex: regex } }))
            });

            // Combine ListingShopData with fetchPost entries
            const shuffledListings = fetchPost.map(post => {
                const shopDetails = ListingShopData.find(shop => shop._id.toString() === post.ShopId.toString());
                return { ...post.toObject(), ShopDetails: shopDetails };
            });

            // Shuffle the combined listings based on specified criteria (assuming shuffleListings is defined and correctly implemented)
            shuffleListings(shuffledListings);

            // Respond with the shuffled listings including both ListingShopData and fetchPost
            res.status(200).json({ listings: shuffledListings });
        }

    } catch (error) {
        console.error('Error searching listings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Function to shuffle listings based on specified criteria
function shuffleListings(listings) {
    let shuffledListings = [];
    let goldListings = [];
    let silverListings = [];
    let freeListings = [];

    // Categorize listings into gold, silver, and free based on your criteria
    listings.forEach(listing => {
        if (listing.ListingPlan === 'Gold') {
            goldListings.push(listing);
        } else if (listing.ListingPlan === 'Silver') {
            silverListings.push(listing);
        } else {
            freeListings.push(listing);
        }
    });

    // Shuffle gold listings (if any)
    shuffleArray(goldListings);
    // Shuffle silver listings (if any)
    shuffleArray(silverListings);
    // Shuffle free listings (if any)
    shuffleArray(freeListings);

    // Push shuffled listings into shuffledListings array
    shuffledListings = [...goldListings, ...silverListings, ...freeListings];

    return shuffledListings;
}

// Function to shuffle an array (Fisher-Yates shuffle algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Function to shuffle listings based on specified criteria
function shuffleListings(listings) {
    let shuffledListings = [];
    let goldListings = [];
    let silverListings = [];
    let freeListings = [];

    // Categorize listings into gold, silver, and free based on your criteria
    listings.forEach(listing => {
        if (listing.ListingPlan === 'Gold') {
            goldListings.push(listing);
        } else if (listing.ListingPlan === 'Silver') {
            silverListings.push(listing);
        } else {
            freeListings.push(listing);
        }
    });

    // Shuffle gold listings (if any)
    shuffleArray(goldListings);
    // Shuffle silver listings (if any)
    shuffleArray(silverListings);
    // Shuffle free listings (if any)
    shuffleArray(freeListings);

    // Push shuffled listings into shuffledListings array
    shuffledListings = [...goldListings, ...silverListings, ...freeListings];

    return shuffledListings;
}

// Function to shuffle an array (Fisher-Yates shuffle algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Fetch one order straight from Razorpay.
 * Used to hardcode a test key id/secret pair, which meant it silently
 * returned nothing once the project moved to live credentials.
 */
exports.showPaymentDetails = async (req, res) => {
    try {
        const OrderId = req.params.id;
        if (!OrderId) {
            return res.status(400).json({ success: false, message: 'Order id is required' });
        }

        const orderDetails = await paymentService.fetchOrder(OrderId);

        return res.status(200).json({ success: true, orderDetails });
    } catch (error) {
        console.error('Error fetching payment details from Razorpay:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch payment details from Razorpay'
        });
    }
};

/**
 * Admin payments table.
 *
 * The old version hit api.razorpay.com with a hardcoded LIVE key/secret while
 * the rest of the app ran on TEST keys - so orders created in test mode always
 * came back 400/not-found and the admin table showed "N/A" everywhere.
 * Everything now goes through the SDK using the one configured key pair.
 */
exports.allPayments = async (req, res) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const fetchOrderWithRetry = async (orderId, attempt = 0) => {
        try {
            return await paymentService.fetchOrder(orderId);
        } catch (error) {
            const status = error.statusCode || (error.response && error.response.status);
            if (status === 429 && attempt < MAX_RETRIES) {
                await sleep(Math.pow(2, attempt) * RETRY_DELAY);
                return fetchOrderWithRetry(orderId, attempt + 1);
            }
            throw error;
        }
    };

    try {
        const paymentsDb = await Payment.find()
            .populate('shopUserId', 'UserName ShopName Email ContactNumber ListingPlan')
            .sort({ createdAt: -1 });

        // Sequential-with-small-concurrency instead of firing every order at
        // once, which is what was tripping Razorpay's rate limiter.
        const results = [];
        const CONCURRENCY = 5;

        for (let i = 0; i < paymentsDb.length; i += CONCURRENCY) {
            const slice = paymentsDb.slice(i, i + CONCURRENCY);
            const settled = await Promise.all(slice.map(async (payment) => {
                try {
                    const orderDetails = await fetchOrderWithRetry(payment.razorpay_order_id);
                    return { ...payment.toObject(), orderDetails };
                } catch (error) {
                    return { ...payment.toObject(), orderDetailsError: error.message };
                }
            }));
            results.push(...settled);
        }

        return res.status(200).json({ success: true, payments: results });
    } catch (error) {
        console.error('Error fetching payments:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.updatePackageInUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { packageId } = req.body;

        const listingUser = await ListingUser.findById(id);
        if (!listingUser) {
            return res.status(404).json({ success: false, message: 'Listing user not found' });
        }

        const packageDetails = await Package.findById(packageId);
        if (!packageDetails) {
            return res.status(404).json({ success: false, message: 'Package not found' });
        }

        listingUser.ListingPlan = packageDetails.packageName;
        listingUser.PaymentDone = true;

        // Ensure PackagePlanIssued is a number before adding
        listingUser.PackagePlanIssued = Number(listingUser.PackagePlanIssued || 0) + Number(packageDetails.postsDone || 0);

        await listingUser.save();
        return res.status(200).json({ success: true, message: 'Package updated successfully' });

    } catch (error) {
        console.error("Internal server error", error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.updateStatusOfShowingNumber = async (req, res) => {
    try {
        const { id } = req.params;
        const { showNumber } = req.body;
        const listingUser = await ListingUser.findById(id);
        if (!listingUser) {
            return res.status(404).json({ success: false, message: 'Listing user not found' });
        }
        listingUser.showNumber = showNumber;
        const updatedListingUser = await listingUser.save();
        console.log("listingUser", updatedListingUser)
        return res.status(200).json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        })
    }
}

exports.updateStatusOfShowingEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const { showEmail } = req.body;
        const listingUser = await ListingUser.findById(id);
        if (!listingUser) {
            return res.status(404).json({ success: false, message: 'Listing user not found' });
        }
        listingUser.showEmail = showEmail;
        const updatedListingUser = await listingUser.save();
        console.log("listingUser", updatedListingUser)
        return res.status(200).json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        console.log("Internal server error", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        })
    }
}