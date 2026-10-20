'use client';

import React, { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ShoppingBag, CheckCircle2, Loader2 } from 'lucide-react';
import ModernAuthCard from '@/components/ModernAuthCard';
import { useAuth } from '@/context/AuthContext';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, profileName, isMerchant } = useAuth();

  const redirectParam = searchParams.get('redirect');
  const targetDestination = redirectParam || (isMerchant ? '/dashboard' : '/');

  useEffect(() => {
    if (!loading && user) {
      const timer = setTimeout(() => {
        router.replace(targetDestination);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, loading, router, targetDestination]);

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

      {user && !loading ? (
        <div className="w-full max-w-[500px] bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-100 text-center animate-fade-in my-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <h2 className="text-xl font-black text-gray-900 mb-2">
            Already Signed Up!
          </h2>

          <p className="text-sm text-gray-600 mb-6">
            Signed in as <span className="font-bold text-gray-900">{profileName || user?.email || 'User'}</span>.
            Redirecting to marketplace...
          </p>

          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-100">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Redirecting now...</span>
          </div>
        </div>
      ) : (
        /* Modern Login / Register Dual-Panel Card */
        <div className="w-full max-w-[780px]">
          <ModernAuthCard initialMode="signup" />
        </div>
      )}

      {/* Footer notes */}
      <div className="mt-6 text-center text-xs text-gray-500">
        TirfMarket · Hyperlocal Addis Ababa Discounts & Direct Cashless M-PESA
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
