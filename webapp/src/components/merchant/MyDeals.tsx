'use client';

import React from 'react';
import { useApp } from '@/context/MiniAppContext';
import { ArrowLeft, PlusCircle, PowerOff } from 'lucide-react';

interface MyDealsProps {
  onBack: () => void;
  onNavigateToPostDeal: () => void;
}

export const MyDeals: React.FC<MyDealsProps> = ({ onBack, onNavigateToPostDeal }) => {
  const { currentMerchantShop, deals, endDeal } = useApp();

  const shopDeals = deals.filter(d => d.shopId === currentMerchantShop.id);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden pb-20 animate-in fade-in duration-200">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 p-1.5 -ml-1 rounded-lg hover:bg-slate-200/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={onNavigateToPostDeal}
          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Deal</span>
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Active Store Deals
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your discounts available to shoppers within 2 km of {currentMerchantShop.name}.
          </p>
        </div>

        {shopDeals.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <p className="text-sm font-bold text-slate-700">No active deals right now</p>
            <p className="text-xs text-slate-500">Post a deal to turn your quiet hours into cashless sales.</p>
            <button
              onClick={onNavigateToPostDeal}
              className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              Create first deal
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {shopDeals.map((deal) => (
              <div
                key={deal.id}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      Code: {deal.itemCode}
                    </span>
                    <h4 className="text-base font-bold text-slate-950 mt-0.5">
                      {deal.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {deal.category} · Valid for {deal.expiryHours}h
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    deal.unitsLeft > 0 && !deal.isHidden
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {deal.unitsLeft > 0 && !deal.isHidden ? 'Active' : 'Ended'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Price</span>
                    <span className="font-extrabold text-emerald-800 tabular-nums">
                      {deal.finalPrice} ETB
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Discount</span>
                    <span className="font-bold text-amber-700 tabular-nums">
                      -{deal.discountPct}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Units Left</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {deal.unitsLeft} / {deal.unitsTotal}
                    </span>
                  </div>
                </div>

                {/* Deal Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {deal.reportCount > 0 ? `${deal.reportCount}/3 shopper reports` : 'Zero reports'}
                  </span>
                  
                  {deal.unitsLeft > 0 && !deal.isHidden ? (
                    <button
                      onClick={() => endDeal(deal.id)}
                      className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                    >
                      <PowerOff className="w-3.5 h-3.5" />
                      <span>End Deal</span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Deal ended</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
