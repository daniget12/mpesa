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
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { requestAuthCode, verifyAuthCode } from '@/lib/dashboardApi';
import {
  verifyMerchantPassword,
  setMerchantPassword,
  hasMerchantPassword,
} from '@/lib/merchantAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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

  // Merchant authentication state
  const [merchantMode, setMerchantMode] = useState<'password' | 'otp' | 'set-password'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Customer auth state (Supabase)
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isCustomerSignup, setIsCustomerSignup] = useState(false);

  // Complete merchant redirect helper
  const completeMerchantLogin = (destination?: string) => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirect = destination || searchParams.get('redirect') || '/dashboard';
    setTimeout(() => {
      if (onSuccess) {
        onSuccess();
      } else if (onClose) {
        onClose();
        router.push(redirect);
      } else {
        router.push(redirect);
      }
    }, 600);
  };

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

  // Merchant Sign In with Password (Default)
  const handleMerchantPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid merchant email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await verifyMerchantPassword(cleanEmail, password);
      if (res.success) {
        setSuccessMsg('Sign in successful! Opening merchant dashboard...');
        completeMerchantLogin();
      } else if (res.notFound) {
        setError('No password has been set for this shop yet. Please use "Sign in with one-time code" to set your password.');
      } else {
        setError(res.error || 'Invalid email or password.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
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

      const receivedToken = res.token || null;
      setVerifiedToken(receivedToken);

      // Check if merchant already has a password set
      const alreadyHas = hasMerchantPassword(cleanEmail);
      if (!alreadyHas) {
        setSuccessMsg('Code verified! Set your password now for instant login next time.');
        setMerchantMode('set-password');
      } else {
        setSuccessMsg('Verification successful! Opening merchant dashboard...');
        completeMerchantLogin();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set Password after verification
  const handleSetMerchantPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await setMerchantPassword(cleanEmail, newPassword, undefined, verifiedToken || undefined);
      if (res.success) {
        setSuccessMsg('Password saved! Opening merchant dashboard...');
        completeMerchantLogin();
      } else {
        setError(res.error || 'Failed to save password.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Customer Sign In with Supabase
  const handleCustomerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Authentication is not configured. Please contact support.');
      return;
    }

    const cleanEmail = customerEmail.trim().toLowerCase();
    if (!cleanEmail || !customerPassword) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: customerPassword,
      });

      if (signInError) throw signInError;

      setSuccessMsg('Sign in successful! Redirecting...');

      // Get redirect URL from query params
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect') || '/';

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else if (onClose) {
          onClose();
          router.push(redirect);
        } else {
          router.push(redirect);
        }
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Customer Sign Up with Supabase
  const handleCustomerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Authentication is not configured. Please contact support.');
      return;
    }

    const cleanEmail = customerEmail.trim().toLowerCase();
    if (!cleanEmail || !customerPassword || !customerName) {
      setError('Please fill in all required fields.');
      return;
    }

    if (customerPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: customerPassword,
        options: {
          data: {
            full_name: customerName,
            phone: customerPhone || null,
            account_type: 'buyer',
          },
        },
      });

      if (signUpError) throw signUpError;

      // Create profile record
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: customerName,
            phone: customerPhone || null,
            account_type: 'buyer',
            role: 'user',
          });

        if (profileError) console.error('Profile creation error:', profileError);
      }

      setSuccessMsg('Account created successfully! Redirecting...');

      // Get redirect URL from query params
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect') || '/';

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else if (onClose) {
          onClose();
          router.push(redirect);
        } else {
          router.push(redirect);
        }
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create account.';
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
            Customer Access
          </button>
        </div>

        {/* LEFT CONTAINER: CUSTOMER SIGN IN / SIGN UP */}
        <div className="form-container sign-up">
          <form onSubmit={isCustomerSignup ? handleCustomerSignUp : handleCustomerSignIn} className="py-8 px-6 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight mb-1 text-center">
              {isCustomerSignup ? 'Create Customer Account' : 'Customer Sign In'}
            </h2>
            <p className="text-xs text-gray-500 mb-4 text-center">
              {isCustomerSignup
                ? 'Sign up to track your claims and deals'
                : 'Access your claims and order history'}
            </p>

            {/* Error / Success Messages */}
            {error && (
              <div className="mb-3 bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded-lg flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-3 bg-green-50 border border-green-100 text-green-700 px-3 py-2 rounded-lg flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Customer Name (signup only) */}
            {isCustomerSignup && (
              <div className="mb-3">
                <label htmlFor="customer-name" className="block text-xs font-bold text-gray-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required={isCustomerSignup}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-600 transition-all"
                />
              </div>
            )}

            {/* Customer Email */}
            <div className="mb-3">
              <label htmlFor="customer-email" className="block text-xs font-bold text-gray-700 mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  id="customer-email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  placeholder="customer@example.com"
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-600 transition-all"
                />
              </div>
            </div>

            {/* Customer Password */}
            <div className="mb-3">
              <label htmlFor="customer-password" className="block text-xs font-bold text-gray-700 mb-1.5">
                Password *
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  id="customer-password"
                  value={customerPassword}
                  onChange={(e) => setCustomerPassword(e.target.value)}
                  required
                  placeholder={isCustomerSignup ? "At least 6 characters" : "Enter your password"}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-600 transition-all"
                />
              </div>
            </div>

            {/* Customer Phone (signup only, optional) */}
            {isCustomerSignup && (
              <div className="mb-4">
                <label htmlFor="customer-phone" className="block text-xs font-bold text-gray-700 mb-1.5">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="07xxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-600 transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isSupabaseConfigured}
              className="action-btn w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isCustomerSignup ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <span>{isCustomerSignup ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Toggle between signin/signup */}
            <div className="mt-4 text-center text-xs text-gray-600">
              {isCustomerSignup ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomerSignup(false);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-green-700 font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomerSignup(true);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-green-700 font-bold hover:underline"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>

            {/* Merchant Registration Link */}
            <div className="w-full border-t border-gray-100 pt-4 mt-4">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700 mb-1">
                <Store className="w-4 h-4 text-green-600" />
                <span>Want to sell on TirfMarket?</span>
              </div>
              <p className="text-[11px] text-gray-500 mb-2 text-center">
                Register your shop to post discounted deals.
              </p>
              <Link
                href="/merchant/register"
                onClick={() => {
                  if (onClose) onClose();
                }}
                className="inline-flex items-center justify-center gap-1 text-xs font-bold text-green-700 hover:text-green-800 hover:underline mx-auto"
              >
                <span>Register your shop</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile switch to Merchant Sign In */}
            <div className="md:hidden mt-4 text-xs text-gray-600 text-center">
              Are you a merchant?{' '}
              <button
                type="button"
                onClick={switchToSignIn}
                className="text-green-700 font-bold hover:underline"
              >
                Merchant Sign In
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT CONTAINER: MERCHANT SIGN IN (Password & One-Time Code Support) */}
        <div className="form-container sign-in">
          <div className="py-8 px-6 text-center flex flex-col justify-center items-center h-full max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center mb-3">
              {merchantMode === 'set-password' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <KeyRound className="w-6 h-6" />
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">
              {merchantMode === 'set-password'
                ? 'Set Your Password'
                : merchantMode === 'otp'
                ? 'One-Time Sign In'
                : 'Merchant Portal'}
            </h1>
            <p className="text-xs text-gray-500 mb-4">
              {merchantMode === 'set-password'
                ? 'Create a password for fast future logins without email codes.'
                : merchantMode === 'otp'
                ? 'Enter your registered shop email to receive a 6-digit login code.'
                : 'Sign in directly with your registered shop email and password.'}
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

            {/* MODE 1: EMAIL & PASSWORD (DEFAULT) */}
            {merchantMode === 'password' && (
              <form onSubmit={handleMerchantPasswordSignIn} className="w-full space-y-3">
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

                <div className="w-full text-left">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMerchantMode('otp');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] text-green-700 hover:underline font-semibold cursor-pointer"
                    >
                      Forgot / Set Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="form-input !pl-10 !pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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
                    'Sign In to Dashboard'
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMerchantMode('otp');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-gray-500 hover:text-green-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Sign in with one-time email code instead</span>
                  </button>
                </div>
              </form>
            )}

            {/* MODE 2: ONE-TIME EMAIL CODE (RECOVERY / INITIAL SETUP) */}
            {merchantMode === 'otp' && (
              <>
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

                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setMerchantMode('password');
                          setError(null);
                          setSuccessMsg(null);
                        }}
                        className="text-xs text-gray-500 hover:text-green-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Password Login</span>
                      </button>
                    </div>
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
                        'Verify & Continue'
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
              </>
            )}

            {/* MODE 3: SET PASSWORD AFTER OTP VERIFICATION */}
            {merchantMode === 'set-password' && (
              <form onSubmit={handleSetMerchantPassword} className="w-full space-y-3">
                <div className="w-full text-left">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    New Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      className="form-input !pl-10 !pr-10"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="w-full text-left">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repeat your new password"
                      className="form-input !pl-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || newPassword.length < 6}
                  className="action-btn w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save Password & Open Dashboard'
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => completeMerchantLogin()}
                    className="text-xs text-gray-500 hover:text-gray-700 font-semibold cursor-pointer"
                  >
                    Skip and open dashboard
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
              <h1 className="text-3xl font-extrabold text-white mb-6">
                Shopping for Deals?
              </h1>
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
