import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, RefreshCw, LogIn } from 'lucide-react';

/**
 * Payment failure page.
 *
 * "Retry" now sends the user to login rather than reloading this page:
 * signing in reopens checkout for the pending order, which is the one flow
 * that actually completes the payment.
 */
const REASONS = {
  missing_params: 'The payment gateway did not send back complete details.',
  verification_failed: 'We could not verify this payment with the gateway.',
  server_error: 'Something went wrong on our side while confirming the payment.',
};

const Failed = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const reason = params.get('reason');
  const orderId = params.get('order');

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900">Payment not completed</h1>

        <p className="mt-3 leading-relaxed text-slate-600">
          {REASONS[reason] || 'Your payment could not be completed.'}{' '}
          If any amount was debited it will be refunded automatically within 5-7 working days.
        </p>

        {orderId && (
          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-left">
            <p className="text-xs uppercase tracking-wide text-slate-400">Order id</p>
            <p className="mt-1 break-all font-mono text-sm text-slate-700">{orderId}</p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <button
            onClick={() => navigate('/Shop-Login')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3
                       font-semibold text-white transition hover:bg-blue-700"
          >
            <LogIn className="h-4 w-4" /> Sign in and retry payment
          </button>

          <button
            onClick={() => navigate('/Free-Listing')}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3
                       font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Back to registration
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Still stuck? Email care@naideal.com with the order id above.
        </p>
      </div>
    </div>
  );
};

export default Failed;
