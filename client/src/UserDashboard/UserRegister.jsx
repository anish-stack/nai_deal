import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { openCheckout } from '../api/razorpay';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Store, AlertCircle, Loader2, Eye, EyeOff, CheckCircle2, CreditCard, ShieldCheck
} from 'lucide-react';
import LocationInput from './LocationInput';
import PackageSelector from './PackageSelector';
import CategorySelector from './CategorySelector';
import CouponSelector from './CouponSelector';
import image from './register.png';

const initialFormData = {
    UserName: '',
    Email: '',
    ContactNumber: '',
    ShopName: '',
    ShopAddress: {
        State: '',
        City: '',
        PinCode: '',
        ShopAddressStreet: '',
        ShopLatitude: '',
        ShopLongitude: '',
        ShopNo: '',
        NearByLandMark: ''
    },
    LandMarkCoordinates: '',
    ShopCategory: '',
    ListingPlan: '',
    HowMuchOfferPost: '',
    Password: '',
    gstNo: '',
    couponCode: ''
};

const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
const validatePhoneNumber = (number) => /^[6-9]\d{9}$/.test(number);
const validatePinCode = (pincode) => /^\d{6}$/.test(pincode);
const validateGST = (gst) => /^[0-9A-Z]{15}$/.test(gst);
const validateUserName = (name) => /^[a-z0-9_]{3,20}$/.test(name);

const UserRegister = () => {
    const [formData, setFormData] = useState(initialFormData);
    const [categories, setCategories] = useState([]);
    const [packages, setPackages] = useState([]);
    const [allCoupon, setAllCoupon] = useState([]);
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [formError, setFormError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchCategories();
        fetchPackages();
        handleFetchCoupon();
    }, []);

    const handleFetchCoupon = async () => {
        try {
            const { data } = await api.get('/get-all-coupon-code');
            setAllCoupon(data.data || []);
        } catch (error) {
            console.log('Could not load coupons', error.message);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data } = await api.get('/admin-get-categories');
            const sorted = (data.data || []).sort((a, b) =>
                a.CategoriesName.localeCompare(b.CategoriesName)
            );
            setCategories(sorted);
        } catch (error) {
            toast.error('Could not load business categories');
        }
    };

    const fetchPackages = async () => {
        try {
            const { data } = await api.get('/admin-packages');
            setPackages(data.packages || []);
        } catch (error) {
            toast.error('Could not load listing plans');
        }
    };

    /** The selected plan object, so we can show a live price summary. */
    const selectedPackage = useMemo(
        () => packages.find((p) => p.packageName === formData.ListingPlan),
        [packages, formData.ListingPlan]
    );

    const isFreePlan = useMemo(
        () => String(formData.ListingPlan || '').trim().toLowerCase().startsWith('free'),
        [formData.ListingPlan]
    );

    const priceSummary = useMemo(() => {
        if (!selectedPackage || isFreePlan) return null;
        const base = Number(selectedPackage.packagePrice) || 0;
        const discountPct = appliedCoupon?.discount || 0;
        const discountAmt = (base * discountPct) / 100;
        return {
            base,
            discountPct,
            discountAmt,
            payable: Math.max(0, base - discountAmt),
        };
    }, [selectedPackage, appliedCoupon, isFreePlan]);

    const handleBlur = (e) => {
        const { name, value } = e.target;
        let errorMsg = '';

        if (name === 'UserName' && !validateUserName(value)) {
            errorMsg = 'Use 3-20 lowercase letters, numbers or underscore';
        } else if (name === 'Email' && value && !validateEmail(value)) {
            errorMsg = 'Enter a valid email address';
        } else if (name === 'ContactNumber' && !validatePhoneNumber(value)) {
            errorMsg = 'Enter a valid 10-digit Indian mobile number';
        } else if (name === 'gstNo' && value && !validateGST(value)) {
            errorMsg = 'GST number must be 15 characters (A-Z, 0-9)';
        } else if (name === 'Password' && value.length < 6) {
            errorMsg = 'Password must be at least 6 characters';
        }

        setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let next = value;

        // Nudge the fields the backend is strict about into the right shape.
        if (name === 'UserName') next = value.toLowerCase().replace(/\s+/g, '');
        if (name === 'ContactNumber') next = value.replace(/\D/g, '').slice(0, 10);
        if (name === 'gstNo') next = value.toUpperCase().slice(0, 15);

        setFormData((prev) => ({ ...prev, [name]: next }));
        setFormError('');
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleLocationSelect = ({ lat, lng }) => {
        setFormData((prev) => ({
            ...prev,
            ShopAddress: {
                ...prev.ShopAddress,
                ShopLatitude: lat ?? prev.ShopAddress.ShopLatitude,
                ShopLongitude: lng ?? prev.ShopAddress.ShopLongitude
            },
            LandMarkCoordinates:
                lat != null && lng != null
                    ? { type: 'Point', coordinates: [lng, lat] }
                    : prev.LandMarkCoordinates
        }));
    };

    const handleCouponSelect = (coupon) => {
        setAppliedCoupon(coupon);
        setFormData((prev) => ({ ...prev, couponCode: coupon ? coupon.code : '' }));
    };

    /**
     * One place that decides whether the form is good to send.
     * The old version fired a separate toast per field and returned early,
     * so a user with four problems had to submit four times to find them all.
     */
    const validateAll = () => {
        const next = {};
        const { ShopAddress } = formData;

        if (!formData.UserName) next.UserName = 'Username is required';
        else if (!validateUserName(formData.UserName))
            next.UserName = 'Use 3-20 lowercase letters, numbers or underscore';

        if (!formData.ShopName) next.ShopName = 'Business name is required';

        if (!formData.ContactNumber) next.ContactNumber = 'Contact number is required';
        else if (!validatePhoneNumber(formData.ContactNumber))
            next.ContactNumber = 'Enter a valid 10-digit Indian mobile number';

        if (formData.Email && !validateEmail(formData.Email))
            next.Email = 'Enter a valid email address';

        if (!ShopAddress.State) next.State = 'State is required';
        if (!ShopAddress.City) next.City = 'City is required';
        if (!ShopAddress.PinCode) next.PinCode = 'Pin code is required';
        else if (!validatePinCode(ShopAddress.PinCode))
            next.PinCode = 'Pin code must be 6 digits';
        if (!ShopAddress.ShopAddressStreet) next.ShopAddressStreet = 'Street address is required';

        if (!formData.ShopCategory) next.ShopCategory = 'Please pick a business category';
        if (!formData.ListingPlan) next.ListingPlan = 'Please choose a listing plan';

        if (formData.gstNo && !validateGST(formData.gstNo))
            next.gstNo = 'GST number must be 15 characters (A-Z, 0-9)';

        if (!formData.Password) next.Password = 'Password is required';
        else if (formData.Password.length < 6)
            next.Password = 'Password must be at least 6 characters';

        setErrors(next);

        if (Object.keys(next).length > 0) {
            setFormError('Please fix the highlighted fields and try again.');
            const firstInvalid = document.querySelector('[data-invalid="true"]');
            firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting || isPaying) return;
        if (!validateAll()) return;

        setIsSubmitting(true);
        setFormError('');

        try {
            const { data } = await api.post('/register-list-user', formData);

            // Free plan: the account is live immediately, nothing to pay.
            if (!data.order) {
                toast.success('Business listed successfully. Please log in.');
                localStorage.removeItem('formData');
                navigate('/Shop-Login');
                return;
            }

            // Paid plan: open checkout. Verification happens inside the handler
            // and returns a login token, so a successful payer goes straight to
            // the dashboard instead of being asked to pay again at login.
            setIsPaying(true);
            try {
                const result = await openCheckout({
                    order: data.order,
                    key: data.key,
                    user: formData,
                    planName: formData.ListingPlan,
                });

                localStorage.removeItem('formData');

                if (result?.token) {
                    localStorage.setItem('ShopToken', result.token);
                    localStorage.setItem('ShopUser', JSON.stringify(result.login || result.user || {}));
                    toast.success('Payment successful. Welcome to Nai Deal!');
                    setTimeout(() => window.location.replace('/Shop-Dashboard'), 800);
                } else {
                    toast.success('Payment successful. Please log in.');
                    navigate('/Shop-Login');
                }
            } catch (paymentError) {
                // The account exists but is unpaid - logging in reopens checkout.
                setFormError(
                    `${paymentError.message} Your account was created; sign in any time to finish the payment.`
                );
                toast.error(paymentError.message);
            } finally {
                setIsPaying(false);
            }
        } catch (error) {
            const msg = error.message || 'Registration failed. Please try again.';
            setFormError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const busy = isSubmitting || isPaying;

    /** Shared input classes, so every field looks and focuses the same. */
    const inputClass = (hasError) =>
        `w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-sm
         outline-none transition focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500
         disabled:bg-slate-50 disabled:text-slate-400
         ${hasError ? 'border-red-300 bg-red-50/40' : 'border-slate-300'}`;

    const Field = ({ label, name, children, required, hint }) => (
        <div data-invalid={errors[name] ? 'true' : 'false'}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {label} {required && <span className="text-red-500">*</span>}
                {hint && <span className="ml-1 font-normal text-slate-400">({hint})</span>}
            </label>
            {children}
            {errors[name] && <p className="mt-1.5 text-xs text-red-600">{errors[name]}</p>}
        </div>
    );

    return (
        <div className="min-h-dvh bg-slate-50">
            <div className="grid lg:grid-cols-[minmax(0,420px)_1fr] min-h-dvh">

                {/* ---------------- Left: brand panel ---------------- */}
                <div className="relative hidden lg:block">
                    <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/85 to-slate-900/90" />

                    <div className="sticky top-0 flex h-dvh flex-col justify-between p-10 text-white">
                        <div className="flex items-center gap-2 text-lg font-semibold">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                                <Store className="h-5 w-5" />
                            </div>
                            Nai Deal
                        </div>

                        <div>
                            <h1 className="text-3xl font-bold leading-tight">
                                List your business in minutes.
                            </h1>
                            <p className="mt-3 text-blue-100 leading-relaxed">
                                Reach customers who are already searching for what you sell,
                                right in your city.
                            </p>

                            <div className="mt-8 space-y-3">
                                {[
                                    'Free plan available - no card needed',
                                    'Publish offers from your own dashboard',
                                    'Secure payments via Razorpay',
                                ].map((line) => (
                                    <div key={line} className="flex items-center gap-3 text-sm text-blue-50">
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-300" />
                                        {line}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="text-sm text-blue-200">
                            Already registered?{' '}
                            <a href="/Shop-Login" className="font-medium text-white underline underline-offset-4">
                                Sign in
                            </a>
                        </div>
                    </div>
                </div>

                {/* ---------------- Right: form ---------------- */}
                <div className="px-5 py-10 sm:px-10 lg:px-14">
                    <div className="mx-auto w-full max-w-3xl">

                        <div className="lg:hidden mb-8 flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
                                <Store className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-semibold text-slate-900">Nai Deal</span>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                                Register your business
                            </h2>
                            <p className="mt-2 text-slate-500">
                                Fields marked <span className="text-red-500">*</span> are required.
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {formError && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-6 overflow-hidden"
                                >
                                    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-700">
                                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                                        <p className="text-sm leading-relaxed">{formError}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit} className="space-y-8" noValidate>

                            {/* ---- Account ---- */}
                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
                                    Account details
                                </h3>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <Field label="Username" name="UserName" required hint="lowercase, no spaces">
                                        <input
                                            type="text" name="UserName" disabled={busy}
                                            value={formData.UserName}
                                            onChange={handleChange} onBlur={handleBlur}
                                            placeholder="sharmastore"
                                            className={inputClass(errors.UserName)}
                                        />
                                    </Field>

                                    <Field label="Business name" name="ShopName" required>
                                        <input
                                            type="text" name="ShopName" disabled={busy}
                                            value={formData.ShopName}
                                            onChange={handleChange} onBlur={handleBlur}
                                            placeholder="Sharma General Store"
                                            className={inputClass(errors.ShopName)}
                                        />
                                    </Field>

                                    <Field label="Contact number" name="ContactNumber" required>
                                        <input
                                            type="tel" inputMode="numeric" name="ContactNumber" disabled={busy}
                                            value={formData.ContactNumber}
                                            onChange={handleChange} onBlur={handleBlur}
                                            placeholder="9876543210"
                                            className={inputClass(errors.ContactNumber)}
                                        />
                                    </Field>

                                    <Field label="Email" name="Email" hint="optional">
                                        <input
                                            type="email" name="Email" disabled={busy}
                                            value={formData.Email}
                                            onChange={handleChange} onBlur={handleBlur}
                                            placeholder="you@example.com"
                                            className={inputClass(errors.Email)}
                                        />
                                    </Field>
                                </div>
                            </section>

                            {/* ---- Location ---- */}
                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
                                    Shop address
                                </h3>
                                <LocationInput
                                    formData={formData}
                                    setFormData={setFormData}
                                    onLocationSelect={handleLocationSelect}
                                />
                                {['State', 'City', 'PinCode', 'ShopAddressStreet']
                                    .filter((k) => errors[k])
                                    .map((k) => (
                                        <p key={k} className="mt-2 text-xs text-red-600">{errors[k]}</p>
                                    ))}
                            </section>

                            {/* ---- Plan ---- */}
                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
                                    Category &amp; plan
                                </h3>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div data-invalid={errors.ShopCategory ? 'true' : 'false'}>
                                        <CategorySelector
                                            categories={categories}
                                            value={formData.ShopCategory}
                                            onChange={(category) =>
                                                setFormData({ ...formData, ShopCategory: category })
                                            }
                                        />
                                        {errors.ShopCategory && (
                                            <p className="mt-1.5 text-xs text-red-600">{errors.ShopCategory}</p>
                                        )}
                                    </div>

                                    <div data-invalid={errors.ListingPlan ? 'true' : 'false'}>
                                        <PackageSelector
                                            packages={packages}
                                            value={formData.ListingPlan}
                                            onChange={(plan) => setFormData({ ...formData, ListingPlan: plan })}
                                        />
                                        {errors.ListingPlan && (
                                            <p className="mt-1.5 text-xs text-red-600">{errors.ListingPlan}</p>
                                        )}
                                    </div>
                                </div>

                                {!isFreePlan && formData.ListingPlan && (
                                    <div className="mt-5">
                                        <CouponSelector coupons={allCoupon} onCouponSelect={handleCouponSelect} />
                                    </div>
                                )}

                                {/* Live price summary so nobody is surprised at checkout. */}
                                {priceSummary && (
                                    <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                                        <div className="flex justify-between text-sm text-slate-600">
                                            <span>{formData.ListingPlan} plan</span>
                                            <span>Rs {priceSummary.base.toFixed(2)}</span>
                                        </div>
                                        {priceSummary.discountPct > 0 && (
                                            <div className="mt-1.5 flex justify-between text-sm text-green-700">
                                                <span>Coupon {appliedCoupon?.code} ({priceSummary.discountPct}% off)</span>
                                                <span>- Rs {priceSummary.discountAmt.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="mt-3 flex justify-between border-t border-blue-200 pt-3 font-semibold text-slate-900">
                                            <span>Payable now</span>
                                            <span>Rs {priceSummary.payable.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* ---- Security ---- */}
                            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
                                    GST &amp; password
                                </h3>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <Field label="GST number" name="gstNo" hint="optional">
                                        <input
                                            type="text" name="gstNo" disabled={busy}
                                            value={formData.gstNo}
                                            onChange={handleChange} onBlur={handleBlur}
                                            placeholder="22AAAAA0000A1Z5"
                                            className={inputClass(errors.gstNo)}
                                        />
                                    </Field>

                                    <Field label="Password" name="Password" required hint="min 6 characters">
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="Password" disabled={busy}
                                                autoComplete="new-password"
                                                value={formData.Password}
                                                onChange={handleChange} onBlur={handleBlur}
                                                className={`${inputClass(errors.Password)} pr-12`}
                                            />
                                            <button
                                                type="button" tabIndex={-1}
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </Field>
                                </div>
                            </section>

                            {/* ---- Submit ---- */}
                            <div className="pb-12">
                                <motion.button
                                    whileHover={busy ? {} : { scale: 1.005 }}
                                    whileTap={busy ? {} : { scale: 0.995 }}
                                    type="submit"
                                    disabled={busy}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4
                                        text-lg font-semibold text-white shadow-sm transition
                                        hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25
                                        disabled:cursor-not-allowed disabled:bg-blue-400"
                                >
                                    {isPaying ? (
                                        <><CreditCard className="h-5 w-5 animate-pulse" /> Opening secure checkout...</>
                                    ) : isSubmitting ? (
                                        <><Loader2 className="h-5 w-5 animate-spin" /> Creating your account...</>
                                    ) : isFreePlan || !formData.ListingPlan ? (
                                        'Register my business'
                                    ) : (
                                        `Pay Rs ${priceSummary ? priceSummary.payable.toFixed(2) : ''} & register`
                                    )}
                                </motion.button>

                                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Payments secured by Razorpay
                                </div>

                                <p className="mt-4 text-center text-sm text-slate-500">
                                    By registering you agree to our{' '}
                                    <a href="/terms-and-conditions" target="_blank" rel="noreferrer"
                                        className="font-medium text-blue-600 hover:text-blue-700">
                                        terms and conditions
                                    </a>.
                                </p>

                                <p className="mt-6 text-center text-sm text-slate-600 lg:hidden">
                                    Already registered?{' '}
                                    <a href="/Shop-Login" className="font-semibold text-blue-600">Sign in</a>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserRegister;
