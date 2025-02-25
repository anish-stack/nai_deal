const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Package schema
const packageSchema = new Schema({
    packageName: {
        type: String,
        required: true
    },
    packagePrice: {
        type: String,
        required: true
    },
    postsDone: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    validity: {
        type: Number, // Store validity in days
        required: true
    },
    expiryDate: {
        type: Date // Store calculated expiry date
    }
}, { timestamps: true });

// Middleware to set expiryDate automatically
packageSchema.pre('save', function (next) {
    if (this.validity) {
        this.expiryDate = new Date(Date.now() + this.validity * 24 * 60 * 60 * 1000); // Convert days to milliseconds
    }
    next();
});

// Create a model based on the schema
const Package = mongoose.model('Package', packageSchema);

module.exports = Package;
