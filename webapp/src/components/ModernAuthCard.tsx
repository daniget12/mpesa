'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Mail,
  KeyRound,
  Store,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import { requestAuthCode, verifyAuthCode } from '@/lib/dashboardApi';
import '@/styles/modern-auth.css';

interface ModernAuthCardProps {
  initialMode?: 'signin' | 'signup';
  onSuccess?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export default function ModernAuthCard({
  initialMode = 'signin',
  onSuccess,
  onClose,
  showCloseButton = false,
}: ModernAuthCardProps) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(initialMode === 'signup');

  // Merchant 6-digit email code state
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Clear messages when flipping panels
  const switchToInfo = () => {
    setIsActive(true);
    setError(null);
    setSuccessMsg(null);
  };

  const switchToSignIn = () => {
    setIsActive(false);
    setError(null);
    setSuccessMsg(null);
  };

  // Step 1: Request 6-digit login code via email
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid merchant email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await requestAuthCode(cleanEmail);
      setCodeSent(true);
      setSuccessMsg(res.message || 'If this email is registered, a 6-digit code was sent.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request verification code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit login code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (cleanCode.length !== 6) {
      setError('Please enter the 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyAuthCode(cleanEmail, cleanCode);
      if (res.error) {
        setError(res.error);
        return;
      }

      setSuccessMsg('Verification successful! Opening merchant dashboard...');
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else if (onClose) {
          onClose();
          router.push('/dashboard');
        } else {
          router.push('/dashboard');
        }
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-auth-wrapper">
      <div className={`modern-auth-container ${isActive ? 'active' : ''}`}>
        {/* Close Button if rendered inside modal */}
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors shadow-xs"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Mobile Tab Switcher (< 768px) */}
        <div className="md:hidden flex border-b border-gray-200 bg-gray-50/80 p-2 rounded-t-2xl">
          <button
            type="button"
            onClick={switchToSignIn}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              !isActive
                ? 'bg-white text-green-700 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Merchant Sign In
          </button>
          <button
            type="button"
            onClick={switchToInfo}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              isActive
                ? 'bg-white text-green-700 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Customer & Shop Info
          </button>
        </div>

        {/* LEFT CONTAINER: CUSTOMERS & NEW MERCHANTS (No Login Needed for Customers) */}
        <div className="form-container sign-up">
          <div className="py-8 px-6 text-center flex flex-col justify-center items-center h-full max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight mb-2">
              Customer Access
            </h2>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4 text-left">
              <p className="text-xs text-emerald-900 font-semibold mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                No account or login required!
              </p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Customers can browse deals within 2 km and pay with Safaricom M-PESA directly on any deal.
              </p>
            </div>

            <Link
              href="/"
              onClick={() => {
                if (onClose) onClose();
              }}
              className="action-btn w-full flex items-center justify-center gap-2 mb-4"
            >
              <span>Explore Nearby Deals</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="w-full border-t border-gray-100 pt-4 mt-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 mb-1">
                <Store className="w-4 h-4 text-green-600" />
                <span>Want to sell on TirfMarket?</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-3">
                Register your shop with your Business TIN to post discounted deals.
              </p>
              <Link
                href="/merchant/register"
                onClick={() => {
                  if (onClose) onClose();
                }}
                className="inline-flex items-center justify-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 hover:underline"
              >
                <span>Register your shop</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile switch back to Sign In */}
            <div className="md:hidden mt-4 text-xs text-gray-600">
              Already a registered merchant?{' '}
              <button
                type="button"
                onClick={switchToSignIn}
                className="text-green-600 font-bold hover:underline"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT CONTAINER: MERCHANT SIGN IN (Emailed 6-digit Code Flow) */}
        <div className="form-container sign-in">
          <div className="py-8 px-6 text-center flex flex-col justify-center items-center h-full max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6" />
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">
              Merchant Portal
            </h1>
            <p className="text-xs text-gray-500 mb-4">
              Enter your registered shop email to receive a 6-digit sign-in code.
            </p>

            {error && (
              <div className="w-full bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-xl mb-3 flex items-center gap-1.5 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-2.5 rounded-xl mb-3 flex items-center gap-1.5 text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {!codeSent ? (
              <form onSubmit={handleRequestCode} className="w-full space-y-3">
                <div className="w-full text-left">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Registered Merchant Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="merchant@yourshop.et"
                      className="form-input !pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="action-btn w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Send 6-Digit Code'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="w-full space-y-3">
                <div className="w-full text-left">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="123456"
                    className="form-input text-center font-mono tracking-widest text-lg font-bold"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                  />
                  <p className="text-[11px] text-gray-500 mt-1 text-center">
                    Sent to <span className="font-semibold text-gray-700">{email}</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || code.trim().length !== 6}
                  className="action-btn w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Verify & Open Dashboard'
                  )}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCodeSent(false);
                      setCode('');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-gray-500 hover:text-green-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Change email
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRequestCode}
                    className="text-xs text-green-700 hover:underline font-semibold cursor-pointer"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-3 border-t border-gray-100 w-full flex items-center justify-between text-xs text-gray-500">
              <span>New shop owner?</span>
              <Link
                href="/merchant/register"
                onClick={() => {
                  if (onClose) onClose();
                }}
                className="font-bold text-green-700 hover:underline"
              >
                Register with TIN
              </Link>
            </div>

            {/* Mobile switch to Customer Info */}
            <div className="md:hidden mt-3 text-xs text-gray-600">
              Are you a customer?{' '}
              <button
                type="button"
                onClick={switchToInfo}
                className="text-green-600 font-bold hover:underline"
              >
                Customer Info
              </button>
            </div>
          </div>
        </div>

        {/* DESKTOP ANIMATED SLIDING OVERLAY */}
        <div className="toggle-container hidden md:block">
          <div className="toggle">
            {/* Left Panel: shown when Active (on Info/Customer mode) */}
            <div className="toggle-panel toggle-left">
              <h1 className="text-3xl font-extrabold text-white mb-2">
                Merchant Portal
              </h1>
              <p className="text-white/90 text-sm max-w-xs mb-6">
                Are you a registered shop? Access your cashless sales, real-time statistics, and deal redemption counter.
              </p>
              <button
                type="button"
                className="ghost-btn"
                onClick={switchToSignIn}
              >
                Merchant Sign In
              </button>
            </div>

            {/* Right Panel: shown when Inactive (on Merchant Sign In mode) */}
            <div className="toggle-panel toggle-right">
              <h1 className="text-3xl font-extrabold text-white mb-2">
                Shopping for Deals?
              </h1>
              <p className="text-white/90 text-sm max-w-xs mb-6">
                Customers do not need an account. Find deals within 2 km and pay directly with M-PESA.
              </p>
              <button
                type="button"
                className="ghost-btn"
                onClick={switchToInfo}
              >
                Customer Info & Shop Signup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
