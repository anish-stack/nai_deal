const Payment = require('../models/PaymentDetails')

exports.getPaymentDetails = async (req, res) => {
    try {
        const paymentDetails = await Payment.find();
        res.status(200).json(paymentDetails);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};