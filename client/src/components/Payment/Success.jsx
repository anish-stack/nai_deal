import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle, LayoutDashboard, LogIn } from 'lucide-react';
import { checkPaymentStatus } from '../../api/razorpay';

/**
 * Landing page for the Razorpay `callback_url` redirect.
 *
 * It no longer just says "Success!" and stops. It confirms the order against
 * the server, which also self-heals the account if the browser was closed
 * before the callback landed - the exact situation that used to leave users
 * paid but still being asked to pay at login.
 */
const Success = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const reference = params.get('reference');
  const orderId = params.get('order');

  const [state, setState] = useState(orderId ? 'checking' : 'unknown');

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await checkPaymentStatus(orderId);
        if (cancelled) return;
        setState(data?.paid ? 'confirmed' : 'pending');
      } catch {
        if (!cancelled) setState('unknown');
      }
    })();

    return () => { cancelled = true; };
  }, [orderId]);

  const hasSession = Boolean(localStorage.getItem('ShopToken'));

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          {state === 'checking'
            ? <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            : state === 'pending'
              ? <AlertCircle className="h-8 w-8 text-amber-500" />
              : <CheckCircle2 className="h-8 w-8 text-green-600" />}
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          {state === 'checking' && 'Confirming your payment...'}
          {state === 'pending' && 'Payment not confirmed yet'}
          {(state === 'confirmed' || state === 'unknown') && 'Payment successful'}
        </h1>

        <p className="mt-3 text-slate-600 leading-relaxed">
          {state === 'checking' && 'Just a moment while we check with the payment gateway.'}
          {state === 'pending' && 'The bank has not confirmed this payment yet. If money was debited it will settle shortly, or be refunded automatically.'}
          {state === 'confirmed' && 'Your listing plan is active. You can start posting your offers right away.'}
          {state === 'unknown' && 'Your payment went through. Please sign in to access your dashboard.'}
        </p>

        {reference && (
          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-left">
            <p className="text-xs uppercase tracking-wide text-slate-400">Payment reference</p>
            <p className="mt-1 break-all font-mono text-sm text-slate-700">{reference}</p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <button
            onClick={() => navigate(hasSession ? '/Shop-Dashboard' : '/Shop-Login')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3
                       font-semibold text-white transition hover:bg-blue-700"
          >
            {hasSession
              ? <><LayoutDashboard className="h-4 w-4" /> Go to dashboard</>
              : <><LogIn className="h-4 w-4" /> Sign in to your dashboard</>}
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to home
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Need help? Email care@naideal.com
        </p>
      </div>
    </div>
  );
};

export default Success;
