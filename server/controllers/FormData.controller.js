const FormData = require('../models/FormDataModel');
const SendWhatsapp = require('../utils/Sendwhatsapp');
const ShopUser = require('../models/User.model');

exports.createFormData = async (req, res) => {
    try {
        const { name, email, phone, message, shopId } = req.body;
        const emptyField = [];

        if (!name) emptyField.push("name");
        if (!email) emptyField.push("email");
        if (!phone) emptyField.push("phone");
        if (!message) emptyField.push("message");

        if (emptyField.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please fill all the required fields",
                emptyField
            });
        }

        // console.log("shopId",shopId)

        const showUser = await ShopUser.findById(shopId);
        if (!showUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const userNumber = showUser?.ContactNumber;
        // console.log("userNumber",userNumber)

        const formData = new FormData({
            name,
            email,
            phone,
            message,
            shopId
        });

        // Construct the WhatsApp message
        const whatsappMessage = `New Inquiry Received:\n\n
        🔹 Name: ${name}\n
        📧 Email: ${email}\n
        📞 Phone: ${phone}\n
        📝 Message: ${message}\n\n
        Please follow up with the user as soon as possible.`;

        await SendWhatsapp(userNumber, whatsappMessage); // Sending the message via WhatsApp
        await formData.save();

        return res.status(200).json({
            success: true,
            message: "Form data saved successfully",
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