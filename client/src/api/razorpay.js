import api from './axiosInstance';

/**
 * Shared Razorpay checkout helper.
 *
 * Every payment in the app goes through this one function, so the key,
 * the verification call and the failure handling can never drift apart
 * between the register page and the login page again.
 *
 * The key is fetched from the server (`/payment/key`) instead of being
 * hardcoded in the bundle - switching test -> live is a server .env change
 * and the frontend needs no rebuild.
 */

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** Load checkout.js once, on demand. */
export const loadRazorpayScript = () =>
    new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);

        const existing = document.querySelector(`script[src="${CHECKOUT_SRC}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve(true));
            existing.addEventListener('error', () => resolve(false));
            return;
        }

        const script = document.createElement('script');
        script.src = CHECKOUT_SRC;
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

/** Public key id, straight from the server. */
export const fetchRazorpayKey = async () => {
    const { data } = await api.get('/payment/key');
    if (!data?.key) throw new Error('Payment gateway is not configured.');
    return data.key;
};

/**
 * Open checkout for an order and verify the result server-side.
 *
 * Verification happens in the `handler` callback rather than via
 * `callback_url`. That matters: the handler runs inside the SPA, so we get the
 * login token back directly and can send the user to their dashboard. The old
 * callback_url flow redirected to a bare server route and dropped the session,
 * which is why paid users landed back on the login screen being asked to pay.
 *
 * @returns {Promise<object>} the verification response payload (contains `token`)
 */
export const openCheckout = async ({
    order,
    key,
    user = {},
    planName = '',
    onDismiss,
}) => {
    const ready = await loadRazorpayScript();
    if (!ready) throw new Error('Could not load the payment gateway. Check your connection.');

    const resolvedKey = key || (await fetchRazorpayKey());

    return new Promise((resolve, reject) => {
        let settled = false;

        const options = {
            key: resolvedKey,
            amount: order?.amount,
            currency: order?.currency || 'INR',
            name: 'Nai Deal',
            description: planName ? `Payment for ${planName} plan` : 'NaiDeal listing plan',
            image:
                'https://res.cloudinary.com/dglihfwse/image/upload/c_thumb,w_200,g_face/v1733212496/naideal-logo_fajvxe.png',
            order_id: order?.id,

            // Verify server-side, then hand the caller the login token.
            handler: async (response) => {
                try {
                    const { data } = await api.post('/payment/verify', {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                    });
                    settled = true;
                    resolve(data);
                } catch (error) {
                    settled = true;
                    reject(new Error(error.message || 'Payment verification failed.'));
                }
            },

            prefill: {
                name: user.UserName || '',
                email: user.Email || '',
                contact: user.ContactNumber || '',
            },
            notes: { orderId: order?.id },
            theme: { color: '#2563eb' },
            modal: {
                ondismiss: () => {
                    if (settled) return;
                    settled = true;
                    if (onDismiss) onDismiss();
                    reject(new Error('Payment was cancelled.'));
                },
            },
        };

        const rzp = new window.Razorpay(options);

        rzp.on('payment.failed', (response) => {
            if (settled) return;
            settled = true;
            reject(
                new Error(
                    response?.error?.description || 'Payment failed. Please try again.'
                )
            );
        });

        rzp.open();
    });
};

/**
 * Ask the server whether an order was actually paid.
 * Used to recover an account when the browser closed mid-payment.
 */
export const checkPaymentStatus = async (orderId) => {
    const { data } = await api.get(`/payment/status/${orderId}`);
    return data;
};

export default { loadRazorpayScript, fetchRazorpayKey, openCheckout, checkPaymentStatus };
