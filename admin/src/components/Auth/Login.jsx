import React, { useState, useEffect } from 'react';
import api, { rootApi } from '../../api/axiosInstance';
import CryptoJS from 'crypto-js';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Admin login.
 *
 * The session secret now comes from the environment rather than being the
 * literal string 'secret-key' in the bundle, and the server issues a real JWT
 * that gets stored alongside the flag.
 */
const SESSION_SECRET = process.env.REACT_APP_SESSION_SECRET || 'naideal-admin-session';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [settings, setSettings] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/get-setting');
        if (data.success) setSettings(data.data);
      } catch (err) {
        console.error('Error fetching settings:', err.message);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!formData.email || !formData.password) {
      setError('Both email and password are required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data } = await rootApi.post('/admin-login', formData);

      if (!data.login) {
        setError('Login failed. Please check your credentials.');
        return;
      }

      console.log('Login successful:', data);
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify({ login: true, token: data.token, at: Date.now() }),
        SESSION_SECRET
      ).toString();

      sessionStorage.setItem('loginData', encrypted);
      if (data.token) sessionStorage.setItem('adminToken', data.token);

      toast.success('Login successful');
      window.location.replace('/');
    } catch (err) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-sm">

        <div className="mb-8 text-center">
          <img
            alt="Nai Deal"
            src={settings?.logo || 'https://placehold.co/600x200?text=Nai+Deal'}
            className="mx-auto h-12 w-auto object-contain"
          />
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            Admin sign in
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Manage listings, packages and payments
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                disabled={isLoading}
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900
                           placeholder:text-slate-400 shadow-sm outline-none transition
                           focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15
                           disabled:bg-slate-50"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-slate-900
                             shadow-sm outline-none transition
                             focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15
                             disabled:bg-slate-50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400
                             hover:bg-slate-100 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3
                         font-semibold text-white shadow-sm transition hover:bg-indigo-700
                         focus:outline-none focus:ring-4 focus:ring-indigo-500/25
                         disabled:cursor-not-allowed disabled:bg-indigo-400"
            >
              {isLoading
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing in...</>
                : <><Lock className="h-4 w-4" /> Sign in</>}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Authorised personnel only
        </p>
      </div>
    </div>
  );
};

export default Login;
