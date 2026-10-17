'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
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
  const { t } = useLanguage();
  const [isActive, setIsActive] = useState(initialMode === 'signup');

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpLocation, setSignUpLocation] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<'buyer' | 'seller'>('buyer');

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    !isSupabaseConfigured
      ? 'User accounts are currently unavailable. Supabase is not configured.'
      : null
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot password view state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Clear messages when flipping panels
  const switchToSignUp = () => {
    setIsActive(true);
    setError(null);
    setSuccessMsg(null);
  };

  const switchToSignIn = () => {
    setIsActive(false);
    setError(null);
    setSuccessMsg(null);
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!isSupabaseConfigured) {
      setError('Supabase authentication is not configured.');
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPassword,
      });

      if (authError) throw authError;

      if (onSuccess) {
        onSuccess();
      } else if (onClose) {
        onClose();
        router.refresh();
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!isSupabaseConfigured) {
      setError('Supabase authentication is not configured.');
      setLoading(false);
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (signUpPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: signUpEmail.trim(),
        password: signUpPassword,
        options: {
          data: {
            full_name: signUpName.trim(),
            phone_number: signUpPhone.trim(),
            location: signUpLocation.trim(),
            account_type: accountType,
          },
        },
      });

      if (authError) throw authError;

      if (data?.user && !data.session) {
        setSuccessMsg('Account created! Please check your email to confirm registration.');
      } else {
        setSuccessMsg('Account created successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          else if (onClose) {
            onClose();
            router.refresh();
          } else {
            router.push('/');
            router.refresh();
          }
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create account.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Social OAuth Handler (Google only)
  const handleSocialAuth = async (provider: 'google' = 'google') => {
    if (!isSupabaseConfigured) {
      setError('Social authentication is not configured in this environment.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Social sign-in failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Password reset handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    if (!isSupabaseConfigured) {
      setForgotError('Supabase authentication is not configured.');
      setForgotLoading(false);
      return;
    }

    try {
      const email = forgotEmail.trim() || signInEmail.trim();
      if (!email) {
        throw new Error('Please enter your email address.');
      }
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      });
      if (resetErr) throw resetErr;
      setForgotSuccess('Password reset link sent! Check your email inbox.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send reset link.';
      setForgotError(msg);
    } finally {
      setForgotLoading(false);
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
            {t('auth.btnSignin') || 'Sign In'}
          </button>
          <button
            type="button"
            onClick={switchToSignUp}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              isActive
                ? 'bg-white text-green-700 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t('auth.btnSignup') || 'Sign Up'}
          </button>
        </div>

        {/* Forgot Password View Overlay */}
        {showForgotModal ? (
          <div className="p-8 md:p-12 flex flex-col justify-center items-center h-full max-w-md mx-auto text-center min-h-[500px]">
            <button
              onClick={() => {
                setShowForgotModal(false);
                setForgotSuccess(null);
                setForgotError(null);
              }}
              className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-green-700 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email address and we will send you a password reset link.
            </p>

            {forgotError && (
              <div className="w-full bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="w-full bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="w-full space-y-4">
              <input
                type="email"
                placeholder={t('auth.email') || 'Email Address'}
                className="form-input"
                value={forgotEmail || signInEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={forgotLoading}
                className="action-btn w-full flex items-center justify-center gap-2"
              >
                {forgotLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* SIGN UP FORM (Left Form Container) */}
            <div className="form-container sign-up">
              <form onSubmit={handleSignUp} className="py-8">
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  {t('auth.signup') || 'Create Account'}
                </h1>

                {/* Google Sign Up */}
                <div className="my-2 w-full flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleSocialAuth('google')}
                    className="w-full max-w-[280px] flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs hover:border-green-600 transition-all cursor-pointer"
                    title="Sign up with Google"
                    aria-label="Google"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"
                      />
                    </svg>
                    <span>{t('auth.googleSignup') || 'Sign up with Google'}</span>
                  </button>
                </div>

                <span className="sub-text">
                  {t('auth.orEmailRegister') || 'or use your email for registration'}
                </span>

                {error && isActive && (
                  <div className="w-full bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-xl my-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-left">{error}</span>
                  </div>
                )}

                {successMsg && isActive && (
                  <div className="w-full bg-green-50 border border-green-200 text-green-700 text-xs p-2.5 rounded-xl my-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-left">{successMsg}</span>
                  </div>
                )}

                {/* Account Type Selector */}
                <div className="w-full grid grid-cols-2 gap-2 my-1">
                  <button
                    type="button"
                    onClick={() => setAccountType('buyer')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      accountType === 'buyer'
                        ? 'bg-green-50 border-green-500 text-green-700 shadow-2xs'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {t('auth.buyer') || 'Buyer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('seller')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      accountType === 'seller'
                        ? 'bg-green-50 border-green-500 text-green-700 shadow-2xs'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {t('auth.seller') || 'Merchant / Seller'}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder={t('auth.fullName') || 'Full Name'}
                  className="form-input"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder={t('auth.email') || 'Email Address'}
                  className="form-input"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  required
                />
                <input
                  type="tel"
                  placeholder={t('auth.phone') || 'Phone Number (+251...)'}
                  className="form-input"
                  value={signUpPhone}
                  onChange={(e) => setSignUpPhone(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder={t('auth.location') || 'City / Location (e.g., Addis Ababa)'}
                  className="form-input"
                  value={signUpLocation}
                  onChange={(e) => setSignUpLocation(e.target.value)}
                />
                <input
                  type="password"
                  placeholder={t('auth.password') || 'Password'}
                  className="form-input"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder={t('auth.confirmPassword') || 'Confirm Password'}
                  className="form-input"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  required
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="action-btn flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('auth.btnSignup') || 'Sign Up'
                  )}
                </button>

                {/* Mobile switch trigger */}
                <div className="md:hidden mt-4 text-xs text-gray-600">
                  {t('auth.haveAccount') || 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={switchToSignIn}
                    className="text-green-600 font-bold hover:underline"
                  >
                    {t('auth.btnSignin') || 'Sign In'}
                  </button>
                </div>
              </form>
            </div>

            {/* SIGN IN FORM (Right Form Container) */}
            <div className="form-container sign-in">
              <form onSubmit={handleSignIn} className="py-8">
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  {t('auth.signin') || 'Sign In'}
                </h1>

                {/* Google Sign In */}
                <div className="my-2 w-full flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleSocialAuth('google')}
                    className="w-full max-w-[280px] flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold shadow-2xs hover:border-green-600 transition-all cursor-pointer"
                    title="Sign in with Google"
                    aria-label="Google"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"
                      />
                    </svg>
                    <span>{t('auth.googleSignin') || 'Sign in with Google'}</span>
                  </button>
                </div>

                <span className="sub-text">
                  {t('auth.orEmailSignin') || 'or use your email password'}
                </span>

                {error && !isActive && (
                  <div className="w-full bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-xl my-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-left">{error}</span>
                  </div>
                )}

                {successMsg && !isActive && (
                  <div className="w-full bg-green-50 border border-green-200 text-green-700 text-xs p-2.5 rounded-xl my-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-left">{successMsg}</span>
                  </div>
                )}

                <input
                  type="email"
                  placeholder={t('auth.email') || 'Email Address'}
                  className="form-input"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder={t('auth.password') || 'Password'}
                  className="form-input"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="forgot-link text-xs hover:underline cursor-pointer"
                >
                  {t('auth.forgotPassword') || 'Forgot Your Password?'}
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="action-btn flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('auth.btnSignin') || 'Sign In'
                  )}
                </button>

                {/* Mobile switch trigger */}
                <div className="md:hidden mt-4 text-xs text-gray-600">
                  {t('auth.noAccount') || "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={switchToSignUp}
                    className="text-green-600 font-bold hover:underline"
                  >
                    {t('auth.btnSignup') || 'Sign Up'}
                  </button>
                </div>
              </form>
            </div>

            {/* TOGGLE CONTAINER (Desktop Animated Sliding Overlay) */}
            <div className="toggle-container hidden md:block">
              <div className="toggle">
                {/* Left Panel shown when active (on Sign Up mode) */}
                <div className="toggle-panel toggle-left">
                  <h1 className="text-3xl font-extrabold text-white">
                    {t('auth.welcomeBack') || 'Welcome Back!'}
                  </h1>
                  <p className="text-white/90 text-sm">
                    {t('auth.welcomeBackDesc') ||
                      'Enter your personal details to use all of site features'}
                  </p>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={switchToSignIn}
                  >
                    {t('auth.btnSignin') || 'Sign In'}
                  </button>
                </div>

                {/* Right Panel shown when inactive (on Sign In mode) */}
                <div className="toggle-panel toggle-right">
                  <h1 className="text-3xl font-extrabold text-white">
                    {t('auth.helloFriend') || 'Hello, Friend!'}
                  </h1>
                  <p className="text-white/90 text-sm">
                    {t('auth.helloFriendDesc') ||
                      'Register with your personal details to use all of site features'}
                  </p>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={switchToSignUp}
                  >
                    {t('auth.btnSignup') || 'Sign Up'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
