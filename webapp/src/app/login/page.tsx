'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ShoppingBag, CheckCircle2, Loader2 } from 'lucide-react';
import ModernAuthCard from '@/components/ModernAuthCard';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, profileName, isMerchant } = useAuth();
  const [isProcessingConfirmation, setIsProcessingConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  const redirectParam = searchParams.get('redirect');
  const targetDestination = redirectParam || (isMerchant ? '/dashboard' : '/');

  // 1. Handle confirmation callback code or token_hash in URL
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const handleCallbackParams = async () => {
      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type') as 'signup' | 'email' | 'recovery' | null;

      if (code) {
        setIsProcessingConfirmation(true);
        setConfirmationMessage('Confirming your account verification code...');
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Code exchange error:', error);
            setIsProcessingConfirmation(false);
          } else if (data.session) {
            setConfirmationMessage('Account confirmed successfully! Redirecting...');
            setTimeout(() => {
              router.replace(targetDestination);
            }, 600);
            return;
          }
        } catch (err) {
          console.error('Failed to exchange auth code:', err);
          setIsProcessingConfirmation(false);
        }
      }

      if (tokenHash && type) {
        setIsProcessingConfirmation(true);
        setConfirmationMessage('Verifying your email confirmation link...');
        try {
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) {
            console.error('OTP verification error:', error);
            setIsProcessingConfirmation(false);
          } else if (data.session) {
            setConfirmationMessage('Email confirmed successfully! Redirecting...');
            setTimeout(() => {
              router.replace(targetDestination);
            }, 600);
            return;
          }
        } catch (err) {
          console.error('Failed to verify OTP:', err);
          setIsProcessingConfirmation(false);
        }
      }
    };

    handleCallbackParams();
  }, [searchParams, router, targetDestination]);

  // 2. If the user is already signed up and authenticated, redirect them automatically
  useEffect(() => {
    if (!loading && user && !isProcessingConfirmation) {
      const timer = setTimeout(() => {
        router.replace(targetDestination);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, loading, isProcessingConfirmation, router, targetDestination]);

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

      {/* Confirmation Processing Card OR Authenticated Notice */}
      {isProcessingConfirmation || (user && !loading) ? (
        <div className="w-full max-w-[500px] bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-100 text-center animate-fade-in my-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <h2 className="text-xl font-black text-gray-900 mb-2">
            {confirmationMessage || 'Signed in successfully!'}
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
          <ModernAuthCard initialMode="signin" />
        </div>
      )}

      {/* Footer notes */}
      <div className="mt-6 text-center text-xs text-gray-500">
        TirfMarket · Hyperlocal Addis Ababa Discounts & Direct Cashless M-PESA
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
