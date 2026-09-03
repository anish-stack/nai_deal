require("dotenv").config();

const razorpayConfig = require("../config/razorpay");
const Plans = require("../models/Pacakge");

/**
 * All Razorpay order work goes through this service.
 * It never holds its own credentials - config/razorpay.js owns those.
 */
class PaymentService {
  constructor() {
    this.config = razorpayConfig;
  }

  get razorpay() {
    if (!this.config.instance) {
      throw new Error(
        "Razorpay is not configured. Check RAZORPAY_MODE and the matching key id/secret in .env"
      );
    }
    return this.config.instance;
  }

  /** Key id the browser checkout needs. Safe to expose - it is public by design. */
  getPublicKey() {
    return this.config.KEY_ID;
  }

  getMode() {
    return this.config.MODE;
  }

  /**
   * Resolve a plan document from a plan string.
   * Accepts "Gold", "Gold - 10 posts", "gold" etc.
   */
  async resolvePlan(listingPlan) {
    if (!listingPlan) throw new Error("Listing plan is required");

    const wanted = String(listingPlan).split("-")[0].trim().toLowerCase();
    const plans = await Plans.find();

    const plan = plans.find(
      (p) => String(p.packageName || "").trim().toLowerCase() === wanted
    );

    if (!plan) throw new Error(`Invalid Listing Plan: ${listingPlan}`);
    return plan;
  }

  /**
   * Price for a plan after applying a percentage coupon.
   * Returns rupees and paise so callers never have to redo the maths.
   */
  async priceFor(listingPlan, couponDiscount = 0) {
    const plan = await this.resolvePlan(listingPlan);

    const basePrice = Number(plan.packagePrice);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      throw new Error("Invalid package price configured for this plan");
    }

    let discount = Number(couponDiscount) || 0;
    if (discount < 0) discount = 0;
    if (discount > 100) discount = 100;

    const discountAmount = (basePrice * discount) / 100;
    const finalPrice = Math.max(0, basePrice - discountAmount);
    const amountInPaise = Math.round(finalPrice * 100);

    return { plan, basePrice, discount, finalPrice, amountInPaise };
  }

  /**
   * Create a Razorpay order.
   *
   * `notes` carry the shop user id and the plan, so a payment can always be
   * traced back to a user even if the OrderId column on the user gets
   * overwritten by a newer attempt.
   */
  async createOrder(listingPlan, userName, couponDiscount = 0, notes = {}) {
    const { plan, basePrice, discount, finalPrice, amountInPaise } =
      await this.priceFor(listingPlan, couponDiscount);

    if (amountInPaise <= 0) {
      throw new Error("Order amount must be greater than zero");
    }

    // Razorpay caps receipt at 40 chars.
    const receipt = `rcpt_${String(userName || "user").slice(0, 18)}_${Date.now()}`.slice(0, 40);

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        planName: plan.packageName,
        userName: String(userName || ""),
        ...notes,
      },
    };

    console.log("[razorpay] creating order", {
      mode: this.config.MODE,
      plan: plan.packageName,
      basePrice,
      couponDiscount: discount,
      finalPrice,
      amountInPaise,
    });

    const order = await this.razorpay.orders.create(options);
    return order;
  }

  /** Signature check - delegates to the shared config. */
  verifySignature(payload) {
    return this.config.verifyPaymentSignature(payload);
  }

  /** Ask Razorpay for the authoritative state of an order. */
  async fetchOrder(orderId) {
    return this.razorpay.orders.fetch(orderId);
  }

  /** Ask Razorpay for the authoritative state of a payment. */
  async fetchPayment(paymentId) {
    return this.razorpay.payments.fetch(paymentId);
  }

  /** Payments recorded against an order (used to confirm a capture). */
  async fetchOrderPayments(orderId) {
    return this.razorpay.orders.fetchPayments(orderId);
  }
}

module.exports = new PaymentService();
