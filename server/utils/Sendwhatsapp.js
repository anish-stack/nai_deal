const axios = require('axios');

const SendWhatsapp = async (number, message) => {
    const apiKey = "308f770861124a7faf62544bb3c173c1";
    const baseUrl = "https://api.wtap.sms4power.com/wapp/v2/api/send";

    // Construct query parameters
    const params = new URLSearchParams({
        apikey: apiKey,
        mobile: number,
        msg: message
    });

    try {
        const response = await axios.get(`${baseUrl}?${params.toString()}`);
        return response.data; // Return only the response data
    } catch (error) {
        console.error("Internal server error:", error);
        return {
            success: false,
            message: "Internal server error",
            error: error.message
        };
    }
};

module.exports = SendWhatsapp;
