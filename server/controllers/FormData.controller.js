const FormData = require('../models/FormDataModel');
const SendWhatsapp = require('../utils/Sendwhatsapp');
const ShopUser = require('../models/User.model');
const OTPStore = new Map(); // Temporary storage for OTPs
const otpExpiryTime = 5 * 60 * 1000; // 5 minutes expiry time
const moment = require("moment");

exports.sendOtpForm = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required",
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
        OTPStore.set(phone, { otp, expiresAt: Date.now() + otpExpiryTime });

        // Check inquiry limit (10 per day)
        const startOfDay = moment().startOf("day").toDate();
        const endOfDay = moment().endOf("day").toDate();

        const inquiryCount = await FormData.countDocuments({
            phone,
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        });

        if (inquiryCount >= 10) {
            return res.status(429).json({
                success: false,
                message: "Inquiry limit exceeded. You can submit only 10 inquiries per day.",
            });
        }

        // Send OTP via WhatsApp or SMS (Replace with actual function)
        await SendWhatsapp(phone, `Your OTP for verification is: ${otp}`);

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
        });
    } catch (error) {
        console.error("Error sending OTP:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

exports.verifyOtpAndSubmitForm = async (req, res) => {
    try {
        const { name, email, phone, message, shopId, otp } = req.body;
        const emptyField = [];

        if (!name) emptyField.push("name");
        if (!email) emptyField.push("email");
        if (!phone) emptyField.push("phone");
        if (!message) emptyField.push("message");
        if (!otp) emptyField.push("otp");

        if (emptyField.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the required fields",
                emptyField,
            });
        }

        // Verify OTP
        const storedOtp = OTPStore.get(phone);
        if (!storedOtp || storedOtp.otp !== parseInt(otp) || Date.now() > storedOtp.expiresAt) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
            });
        }

        OTPStore.delete(phone); // Remove OTP after successful verification

        // Check if shop user exists
        const showUser = await ShopUser.findById(shopId);
        if (!showUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Check inquiry limit (10 per day)
        const startOfDay = moment().startOf("day").toDate();
        const endOfDay = moment().endOf("day").toDate();

        const inquiryCount = await FormData.countDocuments({
            phone,
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        });

        if (inquiryCount >= 10) {
            return res.status(429).json({
                success: false,
                message: "Inquiry limit exceeded. You can submit only 10 inquiries per day.",
            });
        }

        const userNumber = showUser?.ContactNumber;

        const formData = new FormData({
            name,
            email,
            phone,
            message,
            shopId,
        });

        // Construct WhatsApp message
        const whatsappMessage = `New Inquiry Received:\n\n
        🔹 Name: ${name}\n
        📧 Email: ${email}\n
        📞 Phone: ${phone}\n
        📝 Message: ${message}\n\n
        Please follow up with the user as soon as possible.`;

        await SendWhatsapp(userNumber, whatsappMessage); // Send message via WhatsApp
        await formData.save(); // Save form data

        return res.status(200).json({
            success: true,
            message: "Form submitted successfully",
            data: formData,
        });
    } catch (error) {
        console.error("Internal server error", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

exports.getAllFormData = async (req, res) => {
    try {
        const formData = await FormData.find();
        if (!formData) {
            return res.status(404).json({
                success: false,
                message: "No form data found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Form data fetched successfully",
            data: formData
        });
    } catch (error) {
        console.log("Internal server error", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

exports.deleteFormData = async (req, res) => {
    try {
        const { id } = req.body;
        const formData = await FormData.findByIdAndDelete(id);
        if (!formData) {
            return res.status(400).json({
                success: false,
                message: 'Form data not found'
            })
        }
        return res.status(200).json({
            success: true,
            message: "Form data deleted successfully"
        })
    } catch (error) {
        console.log("Internal server error", error)
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        })
    }
}