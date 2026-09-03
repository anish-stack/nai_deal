# NaiDeal — Fix Report

## 1. The payment bug (paid, but still asked to pay)

**Root cause — the order id was never saved.**

`LoginListUser` created a Razorpay order and returned it to the browser, but
never wrote `order.id` onto the user document. The same was true of the
"existing user" branches in `ListUser`. Verification then ran:

```js
ListingUser.findOne({ OrderId: razorpay_order_id })   // → null, always
```

…found nobody, logged *"User not found for the given order ID"*, and left
`PaymentDone = false`. Next login → pay again. Forever.

**Fixed:** every branch that creates an order now persists `OrderId`, and the
user id is also stamped into the Razorpay order `notes`, so a payment can be
matched back to an account even if a newer attempt overwrote the column.

## 2. "Payment verification failed"

`paymentVerification` hashed with a **hardcoded secret string**:

```js
crypto.createHmac("sha256", "5y3UNgaiOM2QtEGdYSeF2jyC")
```

The moment `.env` held a different (or live) key, every signature mismatched.
It also did `findUser.PaymentDone = false` when `findUser` was `null` → 500.

**Fixed:** verification uses the configured secret, is null-safe, and is
idempotent. A signature mismatch no longer auto-fails the payment — the server
asks Razorpay whether the order was actually paid before rejecting it.

## 3. Keys: one source of truth, test and live separated

New `server/config/razorpay.js` owns the credentials. **No key literal exists
anywhere else in the codebase.**

Previously mixed across four places:

| Location | Key used |
|---|---|
| `.env` / order creation | `rzp_test_T8XbqaXF6Hu9ea` |
| `paymentVerification` | secret hardcoded |
| `showPaymentDetails` | `rzp_test_gwvXwuaK4gKsY3` (a *different* test key) |
| `allPayments` | `rzp_live_VM1rZfiucpi71n` (**live**) |
| client `UserRegister` / `ShopLogin` | `rzp_test_T8XbqaXF6Hu9ea` hardcoded in the bundle |

Now one switch:

```env
RAZORPAY_MODE=test          # or: live
RAZORPAY_TEST_KEY_ID=...
RAZORPAY_TEST_KEY_SECRET=...
RAZORPAY_LIVE_KEY_ID=...
RAZORPAY_LIVE_KEY_SECRET=...
```

The server refuses to start quietly if the mode and the key prefix disagree
(e.g. `MODE=test` with an `rzp_live_` key). The frontend fetches the public key
from `GET /payment/key`, so switching to live needs **no frontend rebuild**.

## 4. Recovering the users already stuck

Three independent safety nets, so nobody stays stuck:

- **Login self-heal** — before charging again, login asks Razorpay whether the
  stored order was paid. If yes, the account is activated and the user is
  logged straight in. This rescues every currently-stuck account on their next
  login attempt, with no manual database work.
- **Webhook** (`POST /api/v1/payment/webhook`) — activates the account even if
  the customer closed the browser the instant payment succeeded.
  Set `RAZORPAY_WEBHOOK_SECRET` and point Razorpay at this URL.
- **Status polling** (`GET /api/v1/payment/status/:orderId`) — the success page
  calls this and self-heals the account.

## 5. Single axios instance

`client/src/api/axiosInstance.js` and `admin/src/api/axiosInstance.js`.

- 89 hardcoded `http://localhost:7485` URLs across 49 files → all gone
- One `baseURL` from `.env`
- Request interceptor attaches `ShopToken` / `B2bToken` automatically
- Strips a manually-set `multipart/form-data` header on `FormData` bodies —
  without a boundary that header makes multer reject uploads
- Response interceptor normalises `error.message` and clears dead sessions on
  401 (but not on the login call itself, so a wrong password ≠ expired session)

Usage: `api.get('/admin-packages')` — paths only, no hosts.

## 6. Other backend fixes

| Bug | Effect |
|---|---|
| `process.envCLOUDINARY_API_KEY` (missing dot) | **all Cloudinary uploads broken** |
| `LandMarkCoordinates` / `Location` required in schema | registration 500'd when the map point was skipped |
| `Email`/`ContactNumber` unique but not sparse | second user without an email hit a duplicate-key error |
| `plan.postsDone` with no null check | 500 on an unknown plan name |
| CORS set twice — manual `Origin: *` **plus** `credentials: true` | browsers reject that combination outright |
| `router.delete('/delete_page:/id')` | colon misplaced, route never matched |
| `/get-single-user/:id` was PUT-only | plain GET returned 404 |
| City routes registered twice, second time without multer | image upload worked or not depending on match order |
| Coupons applied without checking `active` / `expiryDate` | expired coupons still discounted |
| WhatsApp API key hardcoded; failure threw | a flaky gateway failed the whole registration |
| `sendToken` returned the full document | **password hash sent to the client on every login** |
| Admin login returned only `{login: true}` | now issues a real JWT |
| `allPayments` fired every order at Razorpay at once | rate-limited; now batched with backoff |

## 7. Admin fixes

- `Payments.jsx` — `currentPayments.reverse()` mutated state during render
  (rows jumped on re-render); `amount / 100 || 'N/A'` printed N/A for a real
  zero. Rewritten with loading/error/empty states and a shop column.
- Session secret moved out of the bundle to `REACT_APP_SESSION_SECRET`;
  sessions now expire after 12 hours.
- `ProtectedRoute` — a wrong decryption key returns `''` rather than throwing,
  so the empty result is now checked explicitly.

## 8. UI

Rewritten: shop login, registration, admin login, payment success/failure.
Two-panel layout, inline per-field validation (all errors at once instead of
one toast at a time), password visibility toggles, loading and paying states,
a live price summary showing the coupon discount before checkout.

`PackageSelector`'s placeholder used `value="Free"` — a user who never opened
the dropdown silently submitted `"Free"`, which is not a real package name.
It is now `value=""` so the required check catches it.

## Setup

```bash
# server
cd server && npm install && npm run dev

# client
cd client && npm install && npm run dev

# admin
cd admin && npm install && npm start
```

Set `FRONTEND_URL` in `server/.env` to the site customers actually use —
payment redirects land there.

## Before going live

1. `RAZORPAY_MODE=live` + fill the live key pair
2. Set `RAZORPAY_WEBHOOK_SECRET` and register the webhook URL in the Razorpay
   dashboard (event: `payment.captured`)
3. Set `CORS_ORIGINS` to your real domains
4. Change `ADMIN_PASSWORD` and `JWT_SECRET`
5. Set `REACT_APP_SESSION_SECRET` in `admin/.env`
6. **Rotate every credential in the old `.env`** — it was committed to the repo,
   so the Mongo URI, SMTP password, Cloudinary secret and Razorpay keys should
   all be considered compromised.
