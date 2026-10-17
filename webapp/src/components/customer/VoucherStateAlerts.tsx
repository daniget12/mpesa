'use client';

import React from 'react';
import { useApp } from '@/context/MiniAppContext';
import { Clock, RefreshCw, XCircle, ShoppingBag, AlertCircle } from 'lucide-react';

interface VoucherStateAlertsProps {
  onBackToDeals: () => void;
  onRetry?: () => void;
}

export const VoucherStateAlerts: React.FC<VoucherStateAlertsProps> = ({ onBackToDeals }) => {
  const { demoState, triggerDemoState, t } = useApp();

  if (!demoState) return null;

  if (demoState === 'expired_hold') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm space-y-4 my-4 animate-in fade-in">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">
            {t.reservationExpiredTitle}
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-xs mx-auto">
            {t.reservationExpiredDesc}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={onBackToDeals}
            className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            {t.exploreNearby}
          </button>
        </div>
      </div>
    );
  }

  if (demoState === 'sold_out') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm space-y-4 my-4 animate-in fade-in">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">
            {t.soldOutTitle}
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-xs mx-auto">
            {t.soldOutDesc}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={onBackToDeals}
            className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            {t.exploreNearby}
          </button>
        </div>
      </div>
    );
  }

  if (demoState === 'payment_failed') {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-6 text-center shadow-sm space-y-4 my-4 animate-in fade-in">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
          <XCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">
            {t.paymentFailedTitle}
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-xs mx-auto">
            {t.paymentFailedDesc}
          </p>
        </div>
        <div className="pt-2 space-y-2">
          <button
            onClick={() => {
              triggerDemoState('deal_detail');
            }}
            className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.tryAgain}</span>
          </button>
          <button
            onClick={onBackToDeals}
            className="w-full py-2 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            {t.exploreNearby}
          </button>
        </div>
      </div>
    );
  }

  if (demoState === 'expired_pickup') {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 p-6 text-center shadow-sm space-y-4 my-4 animate-in fade-in">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">
            {t.voucherExpiredTitle}
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-xs mx-auto">
            {t.voucherExpiredDesc}
          </p>
        </div>
        <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-900 text-left border border-amber-200/60">
          <strong>Refund protection:</strong> Your voucher code is disabled and our system has routed a refund request to our Admin & M-PESA reconciliation queue.
        </div>
        <div className="pt-2">
          <button
            onClick={onBackToDeals}
            className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            {t.exploreNearby}
          </button>
        </div>
      </div>
    );
  }

  if (demoState === 'too_many_claims') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm space-y-4 my-4 animate-in fade-in">
        <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">
            {t.tooManyClaimsTitle}
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-xs mx-auto">
            {t.tooManyClaimsDesc}
          </p>
        </div>
        <div className="pt-2 space-y-2">
          <button
            onClick={() => {
              triggerDemoState('my_claims');
            }}
            className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            {t.viewInMyClaims}
          </button>
          <button
            onClick={onBackToDeals}
            className="w-full py-2 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            {t.exploreNearby}
          </button>
        </div>
      </div>
    );
  }

  return null;
};
