const Payment = require('../models/PaymentDetails');
const ListingUser = require('../models/User.model');
const Partner = require('../models/Partner.model');
const CouponModel = require('../models/Coupon.model');
const paymentService = require('../Service/paymentService');
const razorpayConfig = require('../config/razorpay');
const sendToken = require('../utils/SendToken');
const SendWhatsapp = require('../utils/Sendwhatsapp');

/**
 * Mark a shop user as paid. Idempotent - safe to call from the browser
 * callback, the webhook and the login self-heal path all at once.
 */
async function markUserPaid({ orderId, paymentId, signature, amount }) {
    // Primary lookup: the order id stored on the user when the order was made.
    let user = await ListingUser.findOne({ OrderId: orderId });

    // Fallback: the order's notes carry the shop user id, so a payment can
    // still be matched even if a newer attempt overwrote user.OrderId.
    if (!user) {
        try {
            const order = await paymentService.fetchOrder(orderId);
            const shopUserId = order && order.notes && order.notes.shopUserId;
            if (shopUserId) user = await ListingUser.findById(shopUserId);
        } catch (err) {
            console.error('[payment] fallback order lookup failed:', err.message);
        }
    }

    // Record the payment once. Upsert keeps repeat callbacks from duplicating rows.
    await Payment.findOneAndUpdate(
        { razorpay_order_id: orderId },
        {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
            ...(amount != null ? { amount } : {}),
            ...(user ? { shopUserId: user._id } : {}),
            status: 'paid',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (!user) {
        console.error(`[payment] no shop user matched order ${orderId}`);
        return null;
    }

    if (user.PaymentDone === true) return user; // already settled

    user.PaymentDone = true;
    user.OrderId = orderId;
    user.PaidAt = new Date();
    await user.save();

    // Credit the partner exactly once, on the transition to paid.
    if (user.PartnerId && !user.PartnerCredited) {
        try {
            await Partner.findByIdAndUpdate(user.PartnerId, { $inc: { PartnerDoneListing: 1 } });
            user.PartnerCredited = true;
            await user.save();
        } catch (err) {
            console.error('[payment] partner credit failed:', err.message);
        }
    }

    try {
        await SendWhatsapp(
            user.ContactNumber,
            `Hi ${user.UserName}! Your payment for the ${user.ListingPlan} plan is confirmed. ` +
            `You can now log in at NaiDeal.com and start posting your offers.`
        );
    } catch (err) {
        console.error('[payment] whatsapp confirmation failed:', err.message);
    }

    return user;
}

/**
 * Ask Razorpay directly whether an order has actually been paid.
 * This is the authority we fall back on whenever a signature is missing,
 * malformed, or generated against a different key than the one configured.
 */
async function isOrderPaidAtRazorpay(orderId) {
    try {
        const order = await paymentService.fetchOrder(orderId);
        if (order && order.status === 'paid') {
            const list = await paymentService.fetchOrderPayments(orderId);
            const captured = ((list && list.items) || []).find(
                (p) => p.status === 'captured' || p.status === 'authorized'
            );
            return { paid: true, payment: captured || null, order };
        }
        return { paid: false, payment: null, order };
    } catch (err) {
        console.error('[payment] razorpay order lookup failed:', err.message);
        return { paid: false, payment: null, order: null, error: err.message };
    }
}

/** Public key for the browser checkout, so no frontend has to hardcode it. */
exports.getRazorpayKey = async (req, res) => {
    if (!razorpayConfig.isConfigured) {
        return res.status(503).json({
            success: false,
            message: 'Payment gateway is not configured on the server.',
        });
    }
    return res.status(200).json({
        success: true,
        key: paymentService.getPublicKey(),
        mode: paymentService.getMode(),
    });
};

/**
 * JSON verification - called from the Razorpay checkout `handler` in the SPA.
 * Preferred over callback_url: it returns a login token directly, so a user
 * who has just paid lands on the dashboard instead of a dead redirect.
 */
exports.verifyPaymentJson = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

        if (!razorpay_order_id || !razorpay_payment_id) {
            return res.status(400).json({
                success: false,
                message: 'razorpay_order_id and razorpay_payment_id are required',
            });
        }

        const signatureOk = paymentService.verifySignature({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        });

        let trusted = signatureOk;
        let amount = null;

        // A signature mismatch is usually a key mismatch, not a failed payment.
        // Confirm with Razorpay before rejecting money the customer really paid.
        if (!trusted) {
            console.warn(`[payment] signature mismatch on ${razorpay_order_id}, asking Razorpay`);
            const remote = await isOrderPaidAtRazorpay(razorpay_order_id);
            trusted = remote.paid;
            amount = remote.order ? remote.order.amount : null;
        }

        if (!trusted) {
            await Payment.findOneAndUpdate(
                { razorpay_order_id },
                { razorpay_order_id, razorpay_payment_id, razorpay_signature, status: 'failed' },
                { upsert: true, setDefaultsOnInsert: true }
            );
            return res.status(400).json({
                success: false,
                message: 'Payment could not be verified. If money was deducted it will be auto-refunded, or contact support.',
            });
        }

        const user = await markUserPaid({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            amount,
        });

        if (!user) {
            return res.status(200).json({
                success: true,
                message: 'Payment verified, but no matching account was found. Please contact support.',
            });
        }

        // Log them straight in - this is what stops the "pay again" loop.
        return sendToken(user, res, 200);
    } catch (error) {
        console.error('[payment] verifyPaymentJson error:', error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong while verifying the payment',
        });
    }
};

/**
 * Razorpay `callback_url` handler (form POST, not JSON).
 * Kept for backwards compatibility and non-SPA flows.
 * Always redirects - never leaves the user on a raw JSON error page.
 */
exports.paymentVerificationRedirect = async (req, res) => {
    const frontend = String(process.env.FRONTEND_URL || '').replace(/\/+$/, '');
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

        if (!razorpay_order_id || !razorpay_payment_id) {
            return res.redirect(`${frontend}/payment-failed?reason=missing_params`);
        }

        const signatureOk = paymentService.verifySignature({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        });

        let trusted = signatureOk;
        if (!trusted) {
            console.warn(`[payment] signature mismatch on ${razorpay_order_id}, asking Razorpay`);
            const remote = await isOrderPaidAtRazorpay(razorpay_order_id);
            trusted = remote.paid;
        }

        if (!trusted) {
            await Payment.findOneAndUpdate(
                { razorpay_order_id },
                { razorpay_order_id, razorpay_payment_id, razorpay_signature, status: 'failed' },
                { upsert: true, setDefaultsOnInsert: true }
            );
            return res.redirect(`${frontend}/payment-failed?reason=verification_failed&order=${razorpay_order_id}`);
        }

        await markUserPaid({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
        });

        return res.redirect(
            `${frontend}/paymentsuccess?reference=${razorpay_payment_id}&order=${razorpay_order_id}`
        );
    } catch (error) {
        console.error('[payment] paymentVerificationRedirect error:', error);
        return res.redirect(`${frontend}/payment-failed?reason=server_error`);
    }
};

/**
 * Polling endpoint. If the browser was closed mid-payment, the frontend (or
 * the user hitting login again) can call this and the account self-heals.
 */
exports.getPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({ success: false, message: 'orderId is required' });
        }

        const localUser = await ListingUser.findOne({ OrderId: orderId }).select('-Password');
        if (localUser && localUser.PaymentDone) {
            return res.status(200).json({ success: true, paid: true, source: 'db' });
        }

        const remote = await isOrderPaidAtRazorpay(orderId);
        if (remote.paid) {
            await markUserPaid({
                orderId,
                paymentId: remote.payment ? remote.payment.id : undefined,
                signature: null,
                amount: remote.order ? remote.order.amount : undefined,
            });
            return res.status(200).json({ success: true, paid: true, source: 'razorpay' });
        }

        return res.status(200).json({
            success: true,
            paid: false,
            status: remote.order ? remote.order.status : 'unknown',
        });
    } catch (error) {
        console.error('[payment] getPaymentStatus error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

/**
 * Create a fresh order for an existing unpaid user (retry / upgrade).
 * Self-heals first: if the previous order was in fact paid, no new order is
 * created and the caller is told the account is already active.
 */
exports.createRetryOrder = async (req, res) => {
    try {
        const { userId, contactNumber, couponCode } = req.body || {};

        const user = userId
            ? await ListingUser.findById(userId)
            : await ListingUser.findOne({ ContactNumber: contactNumber });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.PaymentDone) {
            return res.status(200).json({
                success: true,
                alreadyPaid: true,
                message: 'Payment is already complete for this account. Please log in.',
            });
        }

        // Self-heal before charging again.
        if (user.OrderId) {
            const remote = await isOrderPaidAtRazorpay(user.OrderId);
            if (remote.paid) {
                await markUserPaid({
                    orderId: user.OrderId,
                    paymentId: remote.payment ? remote.payment.id : undefined,
                    amount: remote.order ? remote.order.amount : undefined,
                });
                return res.status(200).json({
                    success: true,
                    alreadyPaid: true,
                    message: 'Your earlier payment was found and confirmed. Please log in.',
                });
            }
        }

        let discount = 0;
        if (couponCode) {
            const coupon = await CouponModel.findOne({ code: couponCode });
            if (coupon && coupon.active && new Date(coupon.expiryDate) > new Date()) {
                discount = coupon.discount;
            }
        }

        const order = await paymentService.createOrder(
            user.ListingPlan,
            user.UserName,
            discount,
            { shopUserId: String(user._id) }
        );

        user.OrderId = order.id;
        await user.save();

        return res.status(200).json({
            success: true,
            order,
            key: paymentService.getPublicKey(),
            user: {
                _id: user._id,
                UserName: user.UserName,
                Email: user.Email,
                ContactNumber: user.ContactNumber,
                ListingPlan: user.ListingPlan,
            },
        });
    } catch (error) {
        console.error('[payment] createRetryOrder error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Could not create payment order',
        });
    }
};

/**
 * Razorpay server-to-server webhook. The safety net: even if the customer
 * closes the browser the instant payment succeeds, the account is activated.
 *
 * Needs RAZORPAY_WEBHOOK_SECRET in .env and the raw body preserved
 * (see the express.json verify hook in server.js).
 */
exports.razorpayWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        const rawBody = req.rawBody || JSON.stringify(req.body);

        if (!razorpayConfig.verifyWebhookSignature(rawBody, signature)) {
            console.warn('[payment] webhook signature rejected');
            return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
        }

        const event = req.body && req.body.event;
        const entity = req.body && req.body.payload && req.body.payload.payment
            && req.body.payload.payment.entity;

        if ((event === 'payment.captured' || event === 'order.paid') && entity && entity.order_id) {
            await markUserPaid({
                orderId: entity.order_id,
                paymentId: entity.id,
                signature: null,
                amount: entity.amount,
            });
            console.log(`[payment] webhook ${event} settled order ${entity.order_id}`);
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[payment] webhook error:', error);
        // Always 200 so Razorpay does not retry-hammer us over a bug.
        return res.status(200).json({ success: false });
    }
};

/** Locally stored payment rows (used by the admin shop table). */
exports.getPaymentDetails = async (req, res) => {
    try {
        const paymentDetails = await Payment.find().sort({ createdAt: -1 });
        return res.status(200).json(paymentDetails);
    } catch (error) {
        console.error('[payment] getPaymentDetails error:', error);
        return res.status(500).json({ message: error.message });
    }
};

exports.markUserPaid = markUserPaid;
exports.isOrderPaidAtRazorpay = isOrderPaidAtRazorpay;
