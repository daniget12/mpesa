'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/MiniAppContext';
import { Claim } from '@/types/miniapp';
import { Ticket, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

interface MyClaimsProps {
  onSelectClaim: (claim: Claim) => void;
  onExploreDeals: () => void;
}

export const MyClaims: React.FC<MyClaimsProps> = ({ onSelectClaim, onExploreDeals }) => {
  const { claims, t } = useApp();
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  const activeClaims = claims.filter(c => c.status === 'reserved' || c.status === 'paid');
  const pastClaims = claims.filter(c => c.status !== 'reserved' && c.status !== 'paid');

  const displayedList = activeTab === 'active' ? activeClaims : pastClaims;

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
      {/* Title & Tabs */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">
          {t.myClaimsTab}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Your active redemption vouchers and cashless M-PESA receipts.
        </p>
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
                  <span className="font-extrabold text-emerald-800 text-sm tabular-nums">
                    {claim.finalPrice} ETB
                  </span>
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
