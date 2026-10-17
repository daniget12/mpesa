'use client';

import React from 'react';
import { useApp } from '@/context/MiniAppContext';
import { Clock, CheckCircle2, ShieldCheck, ArrowRight, Store } from 'lucide-react';

interface MerchantPendingProps {
  onBackToDashboard: () => void;
  onGoToAdmin: () => void;
}

export const MerchantPending: React.FC<MerchantPendingProps> = ({ onBackToDashboard, onGoToAdmin }) => {
  const { currentMerchantShop } = useApp();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 text-center space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Friendly Emblem */}
      <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shadow-inner">
        <Store className="w-8 h-8 stroke-[1.8]" />
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-slate-900">
          Application Under Review
        </h2>
        <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
          Thank you for registering <strong className="text-slate-800">{currentMerchantShop.name}</strong>. Our team is manually verifying your business credentials before you can post deals.
        </p>
      </div>

      {/* Status Timeline */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
          Review Status
        </h4>

        {/* Step 1: Submitted */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">1. Details & TIN Submitted</h5>
            <p className="text-[11px] text-slate-500">TIN: {currentMerchantShop.tinNumber} recorded for verification.</p>
          </div>
        </div>

        {/* Step 2: Under Review */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 shadow-sm animate-pulse">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-amber-900">2. Under e-Trade Review</h5>
            <p className="text-[11px] text-slate-600">Checking Ministry of Trade registration on e-Trade registry.</p>
          </div>
        </div>

        {/* Step 3: Approved */}
        <div className="flex items-start gap-3 opacity-50">
          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-bold">3</span>
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-700">3. Approved to Post Deals</h5>
            <p className="text-[11px] text-slate-400">Unlock cashless deals for shoppers within 2 km.</p>
          </div>
        </div>
      </div>

      {/* Demo helper action */}
      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-left text-xs space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Hackathon Demo Fast-Track</span>
        </div>
        <p className="text-[11px] text-emerald-900/80 leading-relaxed">
          In this prototype, you can switch to the Admin page to review and approve this pending application.
        </p>
        <button
          onClick={onGoToAdmin}
          className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          <span>Open Admin Approval Queue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        onClick={onBackToDashboard}
        className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        Return to Demo Shop Dashboard
      </button>
    </div>
  );
};
