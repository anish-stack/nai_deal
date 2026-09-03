const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ListingUserSchema = new mongoose.Schema({
    ProfilePic: {
        type: String
    },
    UserName: {
        type: String,
        required: [true, "Please provide a User Name"],
        unique: true
    },
    ShopName: {
        type: String,
        required: [true, "Please provide a Shop Name"]
    },
    ContactNumber: {
        type: String,
        unique: true,
        sparse: true,        // sparse: several accounts may legitimately have no number
        trim: true
    },
    Email: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true
    },
    ShopAddress: {
        City: {
            type: String,
        },
        PinCode: {
            type: String,
            required: [true, "Please provide a PinCode"]
        },
        ShopNo: {
            type: String,
            required: [true, "Please provide a Shop Number"]
        },
        ShopAddressStreet: {
            type: String,
            required: [true, "Please provide a Shop Address"]
        },
        NearByLandMark: {
            type: String,
            required: [true, "Please provide a Nearby Landmark"]
        },
        // Geo fields are optional: a shop can register without picking a map
        // point. Making these required caused registration to 500 whenever
        // the location picker was skipped.
        Location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],
                default: undefined
            }
        }
    },
    ShopCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categories",
    },
    LandMarkCoordinates: {
        type: {
            type: String,            // Must be "Point"
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],          // [longitude, latitude]
            default: undefined       // left unset when no map point was picked
        }
    },

    BussinessHours: {
        openTime: {
            type: String,

        },
        closeTime: {
            type: String,
        },
        offDay: {
            type: String,
        },
    },



    HowMuchOfferPost: {
        type: Number,
    },
    Password: {
        type: String,
        required: [true, "Please provide a Password"]
    },
    ListingPlan: {
        type: String,
        required: [true, "Please provide Listing Plan"]
    },
    PasswordChangeOtp: {
        type: String
    },
    OtpExipredTme: {
        type: Date
    },
    newPassword: {
        type: String
    },
    PackageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Package",
    },
    Post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PostByShop",
    },
    FreeListing: {
        type: String,
    },
    OrderId: {
        type: String,
        index: true          // payment verification looks users up by this
    },
    PaymentDone: {
        type: Boolean,
        default: false
    },
    PaidAt: {
        type: Date
    },
    // Guarantees the partner's listing count is incremented exactly once,
    // no matter how many times a payment callback fires.
    PartnerCredited: {
        type: Boolean,
        default: false
    },
    PackagePlanIssued: {
        type: Number,
    },
    isUpdatedProfile: {
        type: Boolean,
    },
    PartnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Partner"
    },
    gstNo: {
        type: String
    },
    showNumber : {
        type: Boolean,
        default: true
    },
    showEmail : {
        type: Boolean,
        default: true
    },
}, { timestamps: true });

// Add 2dsphere index to the Location field
ListingUserSchema.index({ 'ShopAddress.Location': '2dsphere' }, { sparse: true });
ListingUserSchema.index({ 'LandMarkCoordinates': '2dsphere' }, { sparse: true });


ListingUserSchema.pre('save', async function (next) {
    const user = this;
    if (!user.isModified('Password')) {
        return next();
    }
    try {
        const hashedPassword = await bcrypt.hash(user.Password, 10);
        user.Password = hashedPassword;
        return next();
    } catch (error) {
        return next(error);
    }
});

// Method to compare passwords
ListingUserSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.Password);
};

const ListingUser = mongoose.model('ShopUser', ListingUserSchema);

module.exports = ListingUser;
