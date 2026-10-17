'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/MiniAppContext';
import { 
  CheckCircle2, 
  XCircle, 
  PlusCircle, 
  Tag, 
  Store 
} from 'lucide-react';

interface MerchantDashboardProps {
  onNavigateToPostDeal: () => void;
  onNavigateToMyDeals: () => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({ 
  onNavigateToPostDeal, 
  onNavigateToMyDeals 
}) => {
  const { 
    currentMerchantShop, 
    shops, 
    setCurrentMerchantShopId, 
    merchantSales, 
    redeemVoucherCode 
  } = useApp();

  const [inputCode, setInputCode] = useState('');
  const [redemptionResult, setRedemptionResult] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    const res = redeemVoucherCode(inputCode);
    if (res.success) {
      setRedemptionResult({
        type: 'success',
        message: 'Redemption successful!',
        details: res.message
      });
      setInputCode('');
    } else {
      setRedemptionResult({
        type: 'error',
        message: 'Redemption failed',
        details: res.message
      });
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Top Shop Bar & Store Switcher */}
      <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">
              {currentMerchantShop.name}
            </h2>
            <p className="text-[10px] text-slate-500 font-mono">
              TIN: {currentMerchantShop.tinNumber} · {currentMerchantShop.category}
            </p>
          </div>
        </div>

        {/* Demo Shop Switcher Dropdown */}
        <select
          value={currentMerchantShop.id}
          onChange={(e) => {
            setCurrentMerchantShopId(e.target.value);
            setRedemptionResult(null);
          }}
          aria-label="Select merchant shop"
          className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 font-medium focus:outline-none"
        >
          {shops.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.category})
            </option>
          ))}
        </select>
      </div>

      {/* "REDEEM A CODE" BOX AT THE TOP (Crucial Counter Tool) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="voucherCodeInput" className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
            Redeem Customer Voucher
          </label>
          <span className="text-[10px] text-slate-400">8-character code</span>
        </div>

        <form onSubmit={handleRedeem} className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="voucherCodeInput"
              type="text"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value.toUpperCase());
                setRedemptionResult(null);
              }}
              placeholder="e.g. K7M4Q9XR"
              maxLength={8}
              className="w-full h-11 px-3 bg-slate-800 text-white placeholder:text-slate-500 font-mono text-base font-bold uppercase tracking-widest rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={inputCode.length < 4}
            className="px-4 h-11 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            Redeem
          </button>
        </form>

        {/* Quick test code buttons */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
          <span>Demo quick test:</span>
          <button
            type="button"
            onClick={() => setInputCode('K7M4Q9XR')}
            className="text-emerald-400 hover:underline font-mono"
          >
            K7M4Q9XR
          </button>
        </div>

        {/* Redemption Result Banner */}
        {redemptionResult && (
          <div className={`mt-3 p-3 rounded-xl border text-xs animate-in fade-in ${
            redemptionResult.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500 text-rose-200'
          }`}>
            <div className="flex items-start gap-2">
              {redemptionResult.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{redemptionResult.message}</p>
                {redemptionResult.details && (
                  <p className="text-[11px] opacity-80 mt-0.5">{redemptionResult.details}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4 STAT CARDS (Deals redeemed, Cashless sales, Pending, Failed) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Stat 1: Deals Redeemed */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 block">Deals Redeemed</span>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {currentMerchantShop.dealsRedeemedCount}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">All verified via code</span>
        </div>

        {/* Stat 2: Cashless Sales (ETB) */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 block">Cashless Sales</span>
          <div className="text-2xl font-black text-emerald-800 mt-1 tabular-nums">
            {currentMerchantShop.cashlessSalesTotal} <span className="text-xs font-bold text-slate-500">ETB</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">Whole birr via M-PESA</span>
        </div>

        {/* Stat 3: Pending Claims */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 block">Pending Pickup</span>
          <div className="text-2xl font-black text-amber-700 mt-1 tabular-nums">
            {currentMerchantShop.pendingSalesCount}
          </div>
          <span className="text-[10px] text-amber-800 font-medium">Shoppers walking over</span>
        </div>

        {/* Stat 4: Failed */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 block">Failed / Cancelled</span>
          <div className="text-2xl font-black text-slate-600 mt-1 tabular-nums">
            {currentMerchantShop.failedSalesCount}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Units auto-released</span>
        </div>
      </div>

      {/* Quick Actions (Post a Deal, Manage Deals) */}
      <div className="flex gap-2">
        <button
          onClick={onNavigateToPostDeal}
          className="flex-1 py-3 px-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Post New Deal</span>
        </button>

        <button
          onClick={onNavigateToMyDeals}
          className="flex-1 py-3 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
        >
          <Tag className="w-4 h-4 text-emerald-700" />
          <span>My Active Deals</span>
        </button>
      </div>

      {/* Recent Cashless Sales Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Recent Cashless Sales
          </h3>
          <span className="text-[11px] text-slate-500">M-PESA Settlement</span>
        </div>

        <div className="divide-y divide-slate-100">
          {merchantSales.slice(0, 5).map((sale) => (
            <div key={sale.id} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <h4 className="font-bold text-slate-900">{sale.dealTitle}</h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>{sale.mpesaReceipt}</span>
                  <span>·</span>
                  <span>Code: {sale.redemptionCode}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-emerald-800 text-sm tabular-nums">
                  +{sale.amount} ETB
                </span>
                <span className={`block text-[10px] font-bold ${
                  sale.status === 'redeemed' 
                    ? 'text-emerald-700' 
                    : sale.status === 'expired_refund_due' 
                    ? 'text-amber-700' 
                    : 'text-blue-700'
                }`}>
                  {sale.status === 'redeemed' ? 'Redeemed' : sale.status === 'expired_refund_due' ? 'Refund Due' : 'Paid'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
