const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    razorpay_order_id: {
        type: String,
        required: true,
        unique: true,   // one row per order - stops duplicate rows on repeat callbacks
        index: true
    },
    razorpay_payment_id: {
        type: String
    },
    razorpay_signature: {
        type: String
    },
    // Amount in paise, as Razorpay reports it.
    amount: {
        type: Number
    },
    status: {
        type: String,
        enum: ['created', 'paid', 'failed'],
        default: 'created'
    },
    // Direct link back to the shop user, so admin reports never have to
    // guess which account a payment belongs to.
    shopUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShopUser'
    }
}, { timestamps: true });

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = Payment;
