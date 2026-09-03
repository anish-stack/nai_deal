import React, { useState, useEffect } from 'react';
import api from '../../api/axiosInstance';
import { openCheckout } from '../../api/razorpay';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  Eye, EyeOff, Store, AlertCircle, Loader2, ShieldCheck, ArrowRight, CreditCard
} from 'lucide-react';
import leftImage from './register.png';

const ShopLogin = () => {
  const [formData, setFormData] = useState({ any: '', Password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});

  // Already signed in? Go straight through - no render flash, no redirect loop.
  useEffect(() => {
    if (localStorage.getItem('ShopToken')) {
      window.location.replace('/Shop-Dashboard');
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));

  const fieldError = (name) => {
    if (!touched[name]) return '';
    if (name === 'any' && !formData.any.trim()) return 'Please enter your username, phone or email';
    if (name === 'Password' && !formData.Password) return 'Please enter your password';
    return '';
  };

  const validateForm = () => {
    if (!formData.any.trim() || !formData.Password) {
      setError('Please fill in both fields');
      setTouched({ any: true, Password: true });
      return false;
    }
    return true;
  };

  /** Store the session and move the user into their dashboard. */
  const completeLogin = (data, message) => {
    if (!data?.token) {
      toast.error('Login response was incomplete. Please try again.');
      return;
    }
    localStorage.setItem('ShopToken', data.token);
    localStorage.setItem('ShopUser', JSON.stringify(data.login || data.user || {}));
    toast.success(message || 'Login successful. Taking you to your dashboard...');
    setTimeout(() => window.location.replace('/Shop-Dashboard'), 800);
  };

  /**
   * Pending payment path.
   *
   * The server has already self-healed: if the earlier order was in fact paid,
   * it logs the user in instead of returning `paymentPending`. So reaching here
   * means the payment genuinely has not gone through.
   */
  const handlePendingPayment = async ({ order, key, user }) => {
    setIsPaying(true);
    try {
      const result = await openCheckout({
        order,
        key,
        user,
        planName: user?.ListingPlan,
      });
      completeLogin(result, 'Payment successful. Welcome back!');
    } catch (paymentError) {
      setError(paymentError.message);
      toast.error(paymentError.message);
    } finally {
      setIsPaying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const { data } = await api.post('/login-shop-user', {
        any: formData.any.trim(),
        Password: formData.Password,
      });

      if (data.paymentPending || data.message === 'Payment Pending Please Pay First') {
        toast('Your plan payment is still pending. Opening checkout...', { icon: '💳' });
        await handlePendingPayment(data);
        return;
      }

      completeLogin(data);
    } catch (err) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const busy = isLoading || isPaying;

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="flex min-h-dvh">

        {/* ---------------- Left: brand panel ---------------- */}
        <div className="hidden lg:flex relative w-1/2">
          <img src={leftImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/80 to-slate-900/90" />

          <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
            <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              Nai Deal
            </div>

            <div className="max-w-md">
              <h1 className="text-4xl font-bold leading-tight">
                Your offers, in front of the right customers.
              </h1>
              <p className="mt-4 text-blue-100 text-lg leading-relaxed">
                Sign in to manage your listing, publish new offers and track how
                many people are finding your business.
              </p>

              <div className="mt-10 space-y-4">
                {[
                  'Post and edit offers any time',
                  'Reach customers searching in your city',
                  'Update your shop profile in seconds',
                ].map((line) => (
                  <div key={line} className="flex items-center gap-3 text-blue-50">
                    <div className="w-5 h-5 rounded-full bg-blue-400/30 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3 h-3" />
                    </div>
                    <span className="text-sm">{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-blue-200">
              New here?{' '}
              <a href="/Free-Listing" className="text-white font-medium underline underline-offset-4">
                List your business free
              </a>
            </div>
          </div>
        </div>

        {/* ---------------- Right: form ---------------- */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-5 py-12 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md"
          >
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-slate-900">Nai Deal</span>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
              <p className="mt-2 text-slate-500">Sign in to your business dashboard</p>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-700">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="any" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Username, phone or email
                </label>
                <input
                  id="any"
                  name="any"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  disabled={busy}
                  value={formData.any}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="yourshop / 9876543210 / you@email.com"
                  className={`block w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400
                    shadow-sm outline-none transition
                    focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500
                    disabled:bg-slate-50 disabled:text-slate-400
                    ${fieldError('any') ? 'border-red-300' : 'border-slate-300'}`}
                />
                {fieldError('any') && (
                  <p className="mt-1.5 text-xs text-red-600">{fieldError('any')}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="Password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <a
                    href="/Forget-Password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="Password"
                    name="Password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={busy}
                    value={formData.Password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter your password"
                    className={`block w-full rounded-xl border px-4 py-3 pr-12 text-slate-900 placeholder:text-slate-400
                      shadow-sm outline-none transition
                      focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500
                      disabled:bg-slate-50 disabled:text-slate-400
                      ${fieldError('Password') ? 'border-red-300' : 'border-slate-300'}`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {fieldError('Password') && (
                  <p className="mt-1.5 text-xs text-red-600">{fieldError('Password')}</p>
                )}
              </div>

              <motion.button
                whileHover={busy ? {} : { scale: 1.01 }}
                whileTap={busy ? {} : { scale: 0.99 }}
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5
                  font-semibold text-white shadow-sm transition
                  hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25
                  disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {isPaying ? (
                  <><CreditCard className="w-5 h-5 animate-pulse" /> Opening secure checkout...</>
                ) : isLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
                ) : (
                  <>Sign in <ArrowRight className="w-4 h-4" /></>
                )}
              </motion.button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <a href="/Free-Listing" className="font-semibold text-blue-600 hover:text-blue-700">
                Create one
              </a>
            </p>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Payments secured by Razorpay
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ShopLogin;
