const axios = require("axios");
require("dotenv").config();

/**
 * WhatsApp notification helper.
 *
 * The API key used to be a string literal in this file. It now comes from
 * .env, and a send failure is logged and swallowed rather than thrown - a
 * flaky notification gateway must never fail a registration or a payment.
 */
const SendWhatsapp = async (number, message) => {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const baseUrl =
    process.env.WHATSAPP_API_URL || "https://api.wtap.sms4power.com/wapp/v2/api/send";

  if (!apiKey) {
    console.warn("[whatsapp] WHATSAPP_API_KEY is not set - skipping message");
    return { success: false, message: "WhatsApp API key not configured" };
  }

  if (!number) {
    console.warn("[whatsapp] no destination number - skipping message");
    return { success: false, message: "No destination number" };
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    mobile: String(number).trim(),
    msg: message,
  });

  try {
    const response = await axios.get(`${baseUrl}?${params.toString()}`, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error("[whatsapp] send failed:", error.message);
    return {
      success: false,
      message: "WhatsApp send failed",
      error: error.message,
    };
  }
};

module.exports = SendWhatsapp;
