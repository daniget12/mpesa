'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(() =>
    isSupabaseConfigured ? 'loading' : 'error'
  );
  const [message, setMessage] = useState(() =>
    isSupabaseConfigured
      ? 'Verifying your confirmation link...'
      : 'Authentication is not configured.'
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const redirect = searchParams.get('redirect') || '/';
    let isHandled = false;

    const completeRedirect = () => {
      if (isHandled) return;
      isHandled = true;
      setStatus('success');
      setMessage('Account confirmed successfully! Redirecting...');
      setTimeout(() => {
        router.replace(redirect);
      }, 700);
    };

    const processAuth = async () => {
      try {
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type') as 'signup' | 'email' | 'recovery' | null;

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (data.session) {
            completeRedirect();
            return;
          }
        }

        if (tokenHash && type) {
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
          if (data.session) {
            completeRedirect();
            return;
          }
        }

        // Check if an existing session is already active
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          completeRedirect();
          return;
        }
      } catch (err: unknown) {
        console.error('Auth callback verification error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to verify confirmation link.';
        setStatus('error');
        setMessage(msg);
      }
    };

    processAuth();

    // Also listen for implicit hash token authentication
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        completeRedirect();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams, router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-emerald-50/40 to-blue-50">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center animate-fade-in">
        {status === 'loading' && (
          <>
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-2">Confirming Account</h2>
            <p className="text-xs text-gray-500 mb-4">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-2">Confirmed & Signed Up!</h2>
            <p className="text-xs text-gray-600 mb-4">{message}</p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Redirecting to marketplace...</span>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-2">Confirmation Note</h2>
            <p className="text-xs text-red-600 mb-5 leading-relaxed">{message}</p>
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Go to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
