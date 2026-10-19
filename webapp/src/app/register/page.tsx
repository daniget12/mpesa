'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import ModernAuthCard from '@/components/ModernAuthCard';

export default function RegisterPage() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 bg-gradient-to-br from-slate-100 via-emerald-50/40 to-blue-50 relative">
      {/* Navigation Header */}
      <div className="w-full max-w-[780px] mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-green-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center text-white shadow-xs">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-gray-900 tracking-tight text-base">
            Tirf<span className="text-green-600">Market</span>
          </span>
        </div>
      </div>

      {/* Modern Login / Register Dual-Panel Card */}
      <div className="w-full max-w-[780px]">
        <ModernAuthCard initialMode="signup" />
      </div>

      {/* Footer notes */}
      <div className="mt-6 text-center text-xs text-gray-500">
        TirfMarket · Hyperlocal Addis Ababa Discounts & Direct Cashless M-PESA
      </div>
    </div>
  );
}
