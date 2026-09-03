/**
 * SINGLE SOURCE OF TRUTH FOR RAZORPAY CREDENTIALS.
 *
 * Nowhere else in the codebase should a Razorpay key/secret literal appear.
 * Everything (order creation, signature verification, admin Order/Payment
 * fetch APIs, and the key handed to the browser checkout) reads from here,
 * so test and live can never get mixed inside one flow again.
 *
 * .env:
 *   RAZORPAY_MODE=test | live
 *   RAZORPAY_TEST_KEY_ID=rzp_test_xxx
 *   RAZORPAY_TEST_KEY_SECRET=xxx
 *   RAZORPAY_LIVE_KEY_ID=rzp_live_xxx
 *   RAZORPAY_LIVE_KEY_SECRET=xxx
 *
 * Legacy fallback (old .env style) is still supported:
 *   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET
 */

require('dotenv').config();

const Razorpay = require('razorpay');
const crypto = require('crypto');

const rawMode = String(process.env.RAZORPAY_MODE || '').trim().toLowerCase();
const MODE = rawMode === 'live' ? 'live' : 'test';

function pick(modeKey, legacyKey) {
    const value = process.env[modeKey];
    if (value && String(value).trim()) return String(value).trim();
    const legacy = process.env[legacyKey];
    return legacy ? String(legacy).trim() : '';
}

const KEY_ID = MODE === 'live'
    ? pick('RAZORPAY_LIVE_KEY_ID', 'RAZORPAY_KEY_ID')
    : pick('RAZORPAY_TEST_KEY_ID', 'RAZORPAY_KEY_ID');

const KEY_SECRET = MODE === 'live'
    ? pick('RAZORPAY_LIVE_KEY_SECRET', 'RAZORPAY_KEY_SECRET')
    : pick('RAZORPAY_TEST_KEY_SECRET', 'RAZORPAY_KEY_SECRET');

if (!KEY_ID || !KEY_SECRET) {
    console.error(
        `[razorpay] FATAL: credentials missing for mode "${MODE}". ` +
        `Set RAZORPAY_${MODE.toUpperCase()}_KEY_ID and RAZORPAY_${MODE.toUpperCase()}_KEY_SECRET in .env`
    );
}

// Guard against the classic mistake: mode says live, key says test (or vice versa).
if (KEY_ID) {
    const keyLooksLive = KEY_ID.startsWith('rzp_live_');
    if (MODE === 'live' && !keyLooksLive) {
        console.error('[razorpay] FATAL: RAZORPAY_MODE=live but the configured key id is not an rzp_live_ key.');
    }
    if (MODE === 'test' && keyLooksLive) {
        console.error('[razorpay] FATAL: RAZORPAY_MODE=test but a LIVE key id is configured. Real money would be charged.');
    }
}

const instance = (KEY_ID && KEY_SECRET)
    ? new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET })
    : null;

/**
 * HMAC-SHA256 signature check for the standard checkout callback.
 * Uses timingSafeEqual so the comparison can't be probed byte by byte.
 */
function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return false;
    if (!KEY_SECRET) return false;

    const expected = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(razorpay_signature), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

/** Signature check for Razorpay server-to-server webhooks. */
function verifyWebhookSignature(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature) return false;

    const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(signature), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

/** Basic auth block for direct calls to api.razorpay.com. */
function apiAuth() {
    return { username: KEY_ID, password: KEY_SECRET };
}

console.log(`[razorpay] mode=${MODE} keyId=${KEY_ID ? KEY_ID.slice(0, 12) + '…' : 'MISSING'}`);

module.exports = {
    MODE,
    KEY_ID,
    KEY_SECRET,
    instance,
    isConfigured: Boolean(instance),
    verifyPaymentSignature,
    verifyWebhookSignature,
    apiAuth,
};
