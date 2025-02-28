const Razorpay = require('razorpay');
const Plans = require('../models/Pacakge');

class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_VM1rZfiucpi71n",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "n5qG5D3NwCspamdBVLe2mZh6",
    });
  }

  async createOrder(listingPlan, userName, couponDiscount = 0) {
    // Extract package name from the listing plan string
    const extractedPlanName = listingPlan.split('-')[0].trim();

    const plansRates = await Plans.find();
    const planDb = plansRates.find(plan => plan.packageName === extractedPlanName);

    if (!planDb) {
      throw new Error('Invalid Listing Plan');
    }

    // Apply discount if available
    let finalPrice = parseInt(planDb.packagePrice);

    if (couponDiscount > 0) {
      const discountAmount = (finalPrice * couponDiscount) / 100;
      finalPrice -= discountAmount;
      finalPrice = Math.max(finalPrice, 0); // Ensure price doesn't go negative
    }

    // Convert to paise (multiply by 100)
    const options = {
      amount: Math.round(finalPrice * 100), 
      currency: 'INR',
      receipt: `user_${userName}_${Date.now()}`,
    };

    console.log("Creating Razorpay Order with Options:", options);

    return this.razorpay.orders.create(options);
  }
}

module.exports = new PaymentService();
