'use client';

import React from 'react';
import { useApp } from '@/context/MiniAppContext';
import { Tag, Ticket, Store, Shield } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { role, setRole, customerTab, setCustomerTab, claims, t, setSelectedDeal } = useApp();

  const activeClaimsCount = claims.filter(c => c.status === 'reserved' || c.status === 'paid').length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1 max-w-[480px] mx-auto">
      <div className="grid grid-cols-4 items-center h-14">
        {/* Tab 1: Deals */}
        <button
          onClick={() => {
            setRole('customer');
            setCustomerTab('deals');
            setSelectedDeal(null);
          }}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            role === 'customer' && customerTab === 'deals'
              ? 'text-emerald-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className={`w-5 h-5 ${role === 'customer' && customerTab === 'deals' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] mt-0.5">{t.dealsTab}</span>
        </button>

        {/* Tab 2: My Claims */}
        <button
          onClick={() => {
            setRole('customer');
            setCustomerTab('claims');
            setSelectedDeal(null);
          }}
          className={`relative flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            role === 'customer' && customerTab === 'claims'
              ? 'text-emerald-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ticket className={`w-5 h-5 ${role === 'customer' && customerTab === 'claims' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] mt-0.5">{t.myClaimsTab}</span>
          {activeClaimsCount > 0 && (
            <span className="absolute top-1.5 right-6 w-4 h-4 bg-emerald-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              {activeClaimsCount}
            </span>
          )}
        </button>

        {/* Tab 3: Merchant */}
        <button
          onClick={() => {
            setRole('merchant');
            setSelectedDeal(null);
          }}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            role === 'merchant'
              ? 'text-emerald-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Store className={`w-5 h-5 ${role === 'merchant' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] mt-0.5">{t.merchantTab}</span>
        </button>

        {/* Tab 4: Admin */}
        <button
          onClick={() => {
            setRole('admin');
            setSelectedDeal(null);
          }}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            role === 'admin'
              ? 'text-emerald-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className={`w-5 h-5 ${role === 'admin' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] mt-0.5">{t.adminTab}</span>
        </button>
      </div>
    </nav>
  );
};
