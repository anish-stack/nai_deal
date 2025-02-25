const mongoose = require('mongoose');

const FormDataSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    shopId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShopUser',
    }
}, { timestamps: true });

module.exports = mongoose.model('FormData', FormDataSchema);