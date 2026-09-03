import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axiosInstance';
import { Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const PER_PAGE = 10;

const STATUS_STYLES = {
    paid: 'bg-green-100 text-green-700',
    attempted: 'bg-amber-100 text-amber-700',
    created: 'bg-slate-100 text-slate-600',
    failed: 'bg-red-100 text-red-700',
};

const Payments = () => {
    const [payments, setPayments] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchPayments = async () => {
        setIsLoading(true);
        setError('');
        try {
            const { data } = await api.get('/admin-all-payments');
            setPayments(Array.isArray(data.payments) ? data.payments : []);
        } catch (err) {
            setError(err.message || 'Could not load payments');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchPayments(); }, []);

    // The old code called .reverse() on the sliced array during render, which
    // mutates state in place and made rows jump around on every re-render.
    // Sorting a copy keeps the order stable.
    const sorted = useMemo(
        () => [...payments].sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        ),
        [payments]
    );

    const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
    const page = Math.min(currentPage, totalPages);
    const visible = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const formatAmount = (paise) => {
        const n = Number(paise);
        // `amount / 100 || 'N/A'` used to print N/A for a genuine zero-rupee order.
        if (!Number.isFinite(n)) return '—';
        return `Rs ${(n / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (value) => {
        if (!value) return '—';
        const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
        return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Payments</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {sorted.length} record{sorted.length === 1 ? '' : 's'}
                    </p>
                </div>
                <button
                    onClick={fetchPayments}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm
                               font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-20 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading payments...
                </div>
            ) : sorted.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center text-slate-500">
                    No payments recorded yet.
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Order ID</th>
                                    <th className="px-4 py-3 font-semibold">Payment ID</th>
                                    <th className="px-4 py-3 font-semibold">Shop</th>
                                    <th className="px-4 py-3 font-semibold">Amount</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visible.map((payment) => {
                                    const order = payment.orderDetails || {};
                                    const shop = payment.shopUserId || {};
                                    const status = order.status || payment.status || 'created';
                                    const amount = order.amount ?? payment.amount;

                                    return (
                                        <tr key={payment._id} className="hover:bg-slate-50/60">
                                            <td className="px-4 py-3 font-mono text-xs text-slate-700">
                                                {payment.razorpay_order_id || '—'}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-700">
                                                {payment.razorpay_payment_id || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">
                                                {shop.ShopName || shop.UserName || '—'}
                                                {shop.ContactNumber && (
                                                    <span className="block text-xs text-slate-400">
                                                        {shop.ContactNumber}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-900">
                                                {formatAmount(amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium
                                                    ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'}`}>
                                                    {status}
                                                </span>
                                                {payment.orderDetailsError && (
                                                    <span className="mt-1 block text-xs text-amber-600">
                                                        gateway lookup failed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {formatDate(order.created_at || payment.createdAt)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-5 flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm
                                               text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm
                                               text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                                >
                                    Next <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Payments;
