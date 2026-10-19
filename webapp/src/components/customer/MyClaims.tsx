'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/MiniAppContext';
import { useAuth } from '@/context/AuthContext';
import { Claim } from '@/types/miniapp';
import { Ticket, Clock, CheckCircle2, ChevronRight, PiggyBank, Lock, LogIn } from 'lucide-react';

interface MyClaimsProps {
  onSelectClaim: (claim: Claim) => void;
  onExploreDeals: () => void;
}

export const MyClaims: React.FC<MyClaimsProps> = ({ onSelectClaim, onExploreDeals }) => {
  const { user } = useAuth();
  const { claims, t } = useApp();
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  const activeClaims = claims.filter(c => c.status === 'reserved' || c.status === 'paid');
  const pastClaims = claims.filter(c => c.status !== 'reserved' && c.status !== 'paid');

  const totalSavedETB = claims.reduce((sum, c) => sum + Math.max(0, c.originalPrice - c.finalPrice), 0);
  const totalOffersClaimed = claims.length;

  const displayedList = activeTab === 'active' ? activeClaims : pastClaims;

  if (!user) {
    return (
      <div className="space-y-4 pb-20 animate-in fade-in duration-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {t.myClaimsTab}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Your active redemption vouchers and cashless M-PESA receipts.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Sign In Required</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              Please sign in to view your claims, active counter vouchers, and past M-PESA receipts.
            </p>
          </div>
          <Link
            href="/login?redirect=/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Register</span>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: Claim['status']) => {
    switch (status) {
      case 'paid':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Ready to Redeem</span>
          </span>
        );
      case 'reserved':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Holding (5 min)</span>
          </span>
        );
      case 'redeemed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Redeemed
          </span>
        );
      case 'expired_pickup':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Expired (Refund Due)
          </span>
        );
      case 'refunded':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            Refunded
          </span>
        );
      case 'expired_hold':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            Hold Expired
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">
          {t.myClaimsTab}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Your active redemption vouchers and cashless M-PESA receipts.
        </p>
      </div>

      {/* Customer Savings & Claims Banner */}
      <div className="p-4 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white rounded-2xl shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
            <PiggyBank className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <span className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider block">
              Total Saved
            </span>
            <span className="text-xl font-black font-mono tracking-tight text-white">
              {totalSavedETB.toLocaleString()} <span className="text-xs font-bold text-emerald-200">ETB</span>
            </span>
          </div>
        </div>
        <div className="border-l border-white/20 pl-4 text-right">
          <span className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider block">
            Offers Claimed
          </span>
          <span className="text-xl font-black font-mono tracking-tight text-white">
            {totalOffersClaimed} <span className="text-xs font-bold text-emerald-200">{totalOffersClaimed === 1 ? 'deal' : 'deals'}</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all min-h-[36px] ${
            activeTab === 'active'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.activeVouchers} ({activeClaims.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all min-h-[36px] ${
            activeTab === 'past'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {t.pastVouchers} ({pastClaims.length})
        </button>
      </div>

      {/* Content List */}
      {displayedList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{t.noActiveClaims}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              {t.noActiveClaimsSub}
            </p>
          </div>
          <button
            onClick={onExploreDeals}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            {t.exploreNearby}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedList.map((claim) => (
            <div
              key={claim.id}
              onClick={() => {
                if (claim.status === 'paid' || claim.status === 'reserved') {
                  onSelectClaim(claim);
                }
              }}
              className={`p-4 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all ${
                claim.status === 'paid' || claim.status === 'reserved'
                  ? 'hover:border-emerald-500/60 cursor-pointer active:scale-[0.99]'
                  : 'opacity-85'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{claim.shopName}</span>
                    <span className="text-[10px] font-mono text-slate-400">· {claim.itemCode}</span>
                  </div>
                  <h4 className="text-base font-bold text-slate-950 mt-0.5 leading-snug">
                    {claim.dealTitle}
                  </h4>
                </div>
                {getStatusBadge(claim.status)}
              </div>

              {/* Code strip */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Code</span>
                  <span className="font-bold text-slate-900 text-sm tracking-wider">
                    {claim.redemptionCode}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block">Paid</span>
                  <div className="flex items-center gap-1.5 justify-end">
                    {claim.originalPrice > claim.finalPrice && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Saved {claim.originalPrice - claim.finalPrice} ETB
                      </span>
                    )}
                    <span className="font-extrabold text-emerald-800 text-sm tabular-nums">
                      {claim.finalPrice} ETB
                    </span>
                  </div>
                </div>
              </div>

              {/* Action hint for active */}
              {(claim.status === 'paid' || claim.status === 'reserved') && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-semibold">
                  <span>Show counter voucher & QR</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
