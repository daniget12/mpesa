'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import {
  getStoredToken,
  clearStoredToken,
  requestAuthCode,
  verifyAuthCode,
  fetchMerchantMe,
  fetchDashboardStats,
  fetchMerchantDeals,
  createMerchantDeal,
  DashboardStats,
  DashboardOrder,
  MerchantMe,
  MerchantDeal,
  CreateDealPayload,
  DashboardApiError,
  MerchantStatus,
  redeemDealCode,
  RedeemResponse,
} from '@/lib/dashboardApi';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  AlertCircle,
  Loader2,
  LogOut,
  Mail,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  ChevronDown,
  Store,
  Tag,
  Search,
  ExternalLink,
  Copy,
  Check,
  Receipt,
  Plus,
  Calendar,
} from 'lucide-react';

// Animated counter hook
function useAnimatedNumber(target: number, duration: number = 400): number {
  const [current, setCurrent] = useState<number>(target);
  const prevTargetRef = useRef<number>(target);

  useEffect(() => {
    const startValue = prevTargetRef.current;
    prevTargetRef.current = target;
    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + (target - startValue) * easeProgress);

      setCurrent(nextValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration]);

  return current;
}

export default function DashboardPage() {
  const { t } = useLanguage();

  // Authentication State
  const [token, setToken] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<MerchantMe | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [codeInput, setCodeInput] = useState<string>('');
  const [codeSent, setCodeSent] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // Dashboard Stats State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isWakingUp, setIsWakingUp] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [statusOverride, setStatusOverride] = useState<string | null>(null);

  // Merchant Deals (Live)
  const [deals, setDeals] = useState<MerchantDeal[]>([]);
  const [dealsLoading, setDealsLoading] = useState<boolean>(false);
  const [isPostDealOpen, setIsPostDealOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postPrice, setPostPrice] = useState<number>(200);
  const [postDiscountPct, setPostDiscountPct] = useState<number>(25);
  const [postExpiryDays, setPostExpiryDays] = useState<number>(7);
  const [postItemCode, setPostItemCode] = useState('');
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccessMessage, setPostSuccessMessage] = useState<string | null>(null);

  // Redeem Code State
  const [redeemCodeInput, setRedeemCodeInput] = useState<string>('');
  const [redeemLoading, setRedeemLoading] = useState<boolean>(false);
  const [redeemResult, setRedeemResult] = useState<RedeemResponse | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<boolean>(false);

  // Orders Search Query
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');

  // Animated counters
  const animatedDealsRedeemed = useAnimatedNumber(stats?.dealsRedeemed ?? 0);
  const animatedSales = useAnimatedNumber(stats?.cashlessSales ?? 0);
  const animatedPending = useAnimatedNumber(stats?.pending ?? 0);
  const animatedFailed = useAnimatedNumber(stats?.failed ?? 0);

  // Format order date/time safely on client
  const formatTime = (isoString?: string | null): string => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '-';
    }
  };

  const formatDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  // Waking server detection (> 5s loading)
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setIsWakingUp(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ref to prevent stacking requests if one is slow
  const isFetchingRef = useRef<boolean>(false);

  // Fetch stats function
  const fetchStats = useCallback(
    async (currentToken?: string, isInitial: boolean = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        if (isInitial) {
          setLoading(true);
        }
        setErrorMessage(null);

        const data = await fetchDashboardStats(currentToken);
        setStats(data);
        setIsWakingUp(false);
      } catch (err: unknown) {
        if (err instanceof DashboardApiError) {
          if (err.status === 401) {
            clearStoredToken();
            setToken(null);
            setMerchant(null);
            setStats(null);
            return;
          }
          if (err.status === 403) {
            if (err.merchantStatus) {
              setStatusOverride(err.merchantStatus);
            }
            return;
          }
          setErrorMessage(err.message);
        } else {
          setErrorMessage(t('dashboard.error'));
        }
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [t]
  );

  // Fetch merchant deals function
  const loadDeals = useCallback(async (currentToken?: string) => {
    setDealsLoading(true);
    try {
      const list = await fetchMerchantDeals(currentToken);
      setDeals(list);
    } catch {
      // Non-fatal, deals empty
    } finally {
      setDealsLoading(false);
    }
  }, []);

  // Initial Load: check stored token
  useEffect(() => {
    const init = async () => {
      const stored = getStoredToken();
      if (!stored) {
        setLoading(false);
        return;
      }

      setToken(stored);
      try {
        const me = await fetchMerchantMe(stored);
        setMerchant(me);

        if (me.status === 'approved') {
          await fetchStats(stored, true);
          await loadDeals(stored);
        } else {
          setLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof DashboardApiError && err.status === 401) {
          clearStoredToken();
          setToken(null);
          setMerchant(null);
        } else {
          setErrorMessage('Could not load merchant profile. Please check your connection.');
        }
        setLoading(false);
      }
    };

    init();
  }, [fetchStats, loadDeals]);

  // Polling Interval: refresh stats every 15 seconds while approved
  useEffect(() => {
    const currentStatus = (statusOverride || merchant?.status || 'approved') as MerchantStatus;
    if (currentStatus !== 'approved' || !token) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStats(token, false);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [token, merchant?.status, statusOverride, fetchStats]);

  // Handle Send Code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      const res = await requestAuthCode(emailInput);
      setAuthMessage(res.message || 'If an account exists for this email, a verification code has been sent.');
      setCodeSent(true);
    } catch (err: unknown) {
      if (err instanceof DashboardApiError) {
        setAuthError(err.message);
      } else {
        setAuthError('Could not send code. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Verify Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeInput.trim().length !== 6) return;

    setAuthLoading(true);
    setAuthError(null);

    try {
      const result = await verifyAuthCode(emailInput, codeInput);
      if (result.error) {
        setAuthError(result.error);
        return;
      }

      if (result.token) {
        setToken(result.token);
        setLoading(true);
        const me = await fetchMerchantMe(result.token);
        setMerchant(me);
        if (me.status === 'approved') {
          await fetchStats(result.token, true);
          await loadDeals(result.token);
        }
      } else {
        setAuthError('No session token received from verification server.');
      }
    } catch (err: unknown) {
      if (err instanceof DashboardApiError) {
        setAuthError(err.message);
      } else {
        setAuthError('Could not verify code. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    clearStoredToken();
    setToken(null);
    setMerchant(null);
    setStats(null);
    setDeals([]);
    setCodeSent(false);
    setEmailInput('');
    setCodeInput('');
    setAuthError(null);
    setAuthMessage(null);
    setStatusOverride(null);
    setRedeemResult(null);
    setRedeemError(null);
    setRedeemCodeInput('');
  };

  // Handle Redeem / Verify Code (Live POST /api/merchant/redeem)
  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = redeemCodeInput.trim().toUpperCase();
    if (!code) return;

    setRedeemLoading(true);
    setRedeemError(null);
    setRedeemResult(null);

    try {
      const res = await redeemDealCode(code, token || undefined);
      setRedeemResult(res);
      setRedeemCodeInput('');
      // Refresh stats immediately after successful redemption
      if (token) {
        fetchStats(token, false);
      }
    } catch (err: unknown) {
      if (err instanceof DashboardApiError) {
        setRedeemError(err.message);
      } else {
        setRedeemError('Could not process voucher redemption.');
      }
    } finally {
      setRedeemLoading(false);
    }
  };

  // Handle Post Deal Submit (Live POST /api/merchant/deals)
  const handlePostDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setPostError('You must be signed in to post deals.');
      return;
    }
    if (!postTitle.trim()) {
      setPostError('Title must be between 3 and 80 characters.');
      return;
    }

    setPostLoading(true);
    setPostError(null);
    setPostSuccessMessage(null);

    try {
      // Calculate future ISO expiry timestamp
      const expiryDate = new Date(Date.now() + postExpiryDays * 24 * 60 * 60 * 1000).toISOString();
      const payload: CreateDealPayload = {
        title: postTitle.trim(),
        price: Math.round(Number(postPrice)),
        discountPct: Math.round(Number(postDiscountPct)),
        expiryDate,
        ...(postItemCode.trim() ? { itemCode: postItemCode.trim().toUpperCase() } : {}),
      };

      const created = await createMerchantDeal(payload, token);
      setPostSuccessMessage(`Deal "${created.title}" published successfully! Final price: ${created.finalAmount} ETB (${created.discountPct}% off).`);
      setTimeout(() => setPostSuccessMessage(null), 6000);
      setPostTitle('');
      setPostItemCode('');
      setIsPostDealOpen(false);
      // Reload deals list & stats
      await loadDeals(token);
      await fetchStats(token, false);
    } catch (err: unknown) {
      if (err instanceof DashboardApiError) {
        setPostError(err.message);
      } else {
        setPostError('Failed to create deal. Please verify your inputs.');
      }
    } finally {
      setPostLoading(false);
    }
  };

  // Filtered orders for cashier search
  const filteredRecentOrders = useMemo(() => {
    if (!stats?.recent) return [];
    const q = orderSearchQuery.toLowerCase().trim();
    if (!q) return stats.recent;
    return stats.recent.filter((o) =>
      (o.dealTitle && o.dealTitle.toLowerCase().includes(q)) ||
      (o.orderId && o.orderId.toLowerCase().includes(q)) ||
      (o.receipt && o.receipt.toLowerCase().includes(q))
    );
  }, [stats, orderSearchQuery]);

  // Render Login Form in Live Mode when unauthenticated
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tirf Market</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight">
              <span className="text-emerald-400">Tirf</span>Market <span className="text-slate-400 font-semibold text-sm">Merchant Hub</span>
            </span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/15">
                <KeyRound className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-black text-white mb-2">{t('dashboard.loginTitle')}</h1>
              <p className="text-slate-400 text-xs sm:text-sm">{t('dashboard.loginSubtitle')}</p>
            </div>

            {authError && (
              <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            {authMessage && (
              <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                <span>{authMessage}</span>
              </div>
            )}

            {!codeSent ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    {t('dashboard.email')}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="merchant@yourshop.et"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all pl-11 text-sm"
                    />
                    <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 disabled:opacity-50 text-sm"
                >
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  <span>{t('dashboard.sendCode')}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    {t('dashboard.code')}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-center text-2xl font-mono tracking-widest text-emerald-400 placeholder-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <p className="text-[11px] text-slate-400 text-center mt-1">
                    Sent to <span className="font-semibold text-slate-200">{emailInput}</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || codeInput.length !== 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 disabled:opacity-50 text-sm"
                >
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  <span>{t('dashboard.verifyCode')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCodeSent(false);
                    setCodeInput('');
                    setAuthError(null);
                  }}
                  className="w-full text-xs text-slate-400 hover:text-white transition-colors text-center py-2 cursor-pointer"
                >
                  Use a different email address
                </button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
              <p className="text-xs text-slate-400">
                {t('dashboard.newShop')}{' '}
                <Link
                  href="/merchant/register"
                  className="font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors"
                >
                  {t('dashboard.registerShop')}
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Active status check for Real Mode
  const currentStatus = (statusOverride || merchant?.status || 'approved') as MerchantStatus;

  if (loading && !merchant && !errorMessage) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-4" />
        <p className="text-slate-400 text-sm">Verifying merchant session...</p>
      </div>
    );
  }

  if (currentStatus === 'pending') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans relative">
        <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            <span>Tirf Market</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-block mb-3">
              Under Review
            </span>
            <h1 className="text-2xl font-black text-white mb-2">Application Under Review</h1>
            <p className="text-slate-400 text-sm mb-6">
              Your merchant application for <strong className="text-white">{merchant?.shopName || merchant?.name || 'your shop'}</strong> is currently under review by TirfMarket compliance. We verify business TIN and storefront information before activation.
            </p>
            <button
              type="button"
              onClick={async () => {
                if (!token) return;
                setLoading(true);
                try {
                  const me = await fetchMerchantMe(token);
                  setMerchant(me);
                  if (me.status === 'approved') {
                    await fetchStats(token, true);
                    await loadDeals(token);
                  }
                } catch (e: unknown) {
                  if (e instanceof DashboardApiError && e.status === 401) {
                    handleLogout();
                  }
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check Status</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (currentStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans relative">
        <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            <span>Tirf Market</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 inline-block mb-3">
              Application Rejected
            </span>
            <h1 className="text-2xl font-black text-white mb-2">Registration Not Approved</h1>
            {(merchant?.rejectionReason || merchant?.error) && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 mb-4 text-left">
                <span className="text-[11px] font-bold text-rose-300 block mb-1">Reason:</span>
                <p className="text-xs text-rose-200">{merchant?.rejectionReason || merchant?.error}</p>
              </div>
            )}
            <p className="text-slate-400 text-sm mb-6">
              Your merchant registration was not approved. You can submit a new registration or contact support.
            </p>
            <Link
              href="/merchant/register"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors block text-center"
            >
              <span>Submit New Registration</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (currentStatus === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans relative">
        <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            <span>Tirf Market</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 inline-block mb-3">
              Account Suspended
            </span>
            <h1 className="text-2xl font-black text-white mb-2">Account Suspended</h1>
            {(merchant?.rejectionReason || merchant?.error) && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 mb-4 text-left">
                <span className="text-[11px] font-bold text-rose-300 block mb-1">Notice:</span>
                <p className="text-xs text-rose-200">{merchant?.rejectionReason || merchant?.error}</p>
              </div>
            )}
            <p className="text-slate-400 text-sm mb-6">
              This merchant account is suspended. Please contact TirfMarket support to resolve this issue.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans pb-20 selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background Decorative Ambient Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[340px] bg-gradient-to-b from-emerald-600/10 via-emerald-900/5 to-transparent blur-[140px] rounded-full pointer-events-none -z-10" />

      {/* Top Projector & Counter Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Left Brand & Shop Name */}
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
              title="Return to Public Marketplace"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 border border-emerald-400/30">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-base sm:text-lg tracking-tight text-white">
                    {merchant?.shopName || merchant?.name || 'Merchant Portal'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Counter
                  </span>
                  <span>·</span>
                  <span className="capitalize">{merchant?.category || 'Cafe'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Heartbeat & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Counter Feed: <strong className="text-emerald-400 font-mono">Real-time (15s)</strong></span>
            </div>

            {/* Offline Alert */}
            {isOffline && (
              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-xl">
                {t('dashboard.offline')}
              </span>
            )}

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('dashboard.logout')}</span>
            </button>

            {/* Quick Link to Marketplace */}
            <Link
              href="/"
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-850 hover:to-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/80 shadow-xs transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Marketplace</span>
            </Link>

            {/* Post Deal Button */}
            <button
              type="button"
              onClick={() => setIsPostDealOpen((prev) => !prev)}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isPostDealOpen ? 'Close' : 'Post Deal'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-1 w-full space-y-8">
        {/* Collapsible Shop Profile Panel */}
        {merchant && (
          <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl transition-all">
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-expanded={isProfileOpen}
              aria-controls="shop-profile-panel"
              className="w-full px-5 py-3.5 min-h-[44px] flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {merchant.shopName || merchant.name || t('dashboard.shopProfile')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  currentStatus === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : currentStatus === 'pending'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {currentStatus}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isProfileOpen && (
              <div id="shop-profile-panel" className="px-5 pb-5 pt-3 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm animate-fade-in">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('register.shopName') || 'Shop Name'}
                  </div>
                  <div className="font-bold text-white text-base">
                    {merchant.shopName || merchant.name || 'Merchant Shop'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('dashboard.category') || 'Category'}
                  </div>
                  <div className="font-medium text-slate-200 capitalize">
                    {merchant.category || 'Shop'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('dashboard.status') || 'Status'}
                  </div>
                  <div className="flex flex-col gap-1 items-start">
                    <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>{t('dashboard.statusApprovedDesc') || 'Active & Verified for M-PESA'}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Waking Server Banner */}
        {isWakingUp && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400 shrink-0" />
            <span>{t('dashboard.waking')}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => fetchStats(token || undefined, true)}
              className="inline-flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('dashboard.retry')}</span>
            </button>
          </div>
        )}

        {/* HERO COMPONENT: Voucher Redemption Counter Box */}
        <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[90px] rounded-full pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/25 border border-emerald-400/30">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
                      {t('dashboard.redeemTitle')}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-400">
                      Enter the 8-character code shown on customer&apos;s phone to verify and redeem.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Input & Action Button */}
              <form onSubmit={handleRedeemCode} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={redeemCodeInput}
                    onChange={(e) => setRedeemCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter 8-character code (e.g. K7M4Q9XR)"
                    disabled={redeemLoading}
                    maxLength={16}
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 rounded-2xl px-5 py-4 text-xl sm:text-2xl md:text-3xl font-mono tracking-wider md:tracking-widest text-emerald-400 placeholder:font-sans placeholder:text-sm sm:placeholder:text-base placeholder:tracking-normal placeholder:text-slate-500 uppercase transition-all min-h-[58px]"
                  />
                  {redeemCodeInput && (
                    <button
                      type="button"
                      onClick={() => setRedeemCodeInput('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={redeemLoading || !redeemCodeInput.trim()}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] text-white font-black text-base sm:text-lg px-8 py-4 rounded-2xl transition-all shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2.5 min-h-[58px] cursor-pointer whitespace-nowrap"
                >
                  {redeemLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('dashboard.redeeming')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{t('dashboard.redeemButton')}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Error Banner */}
              {redeemError && (
                <div className="mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span className="font-semibold">{redeemError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRedeemError(null)}
                    className="text-rose-400 hover:text-rose-200 text-xs font-semibold px-2 py-1 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Digital Boarding Pass Redemption Confirmation Card */}
              {redeemResult && (
                <div className="mt-5 bg-gradient-to-br from-emerald-950/50 via-slate-900/90 to-emerald-950/40 border-2 border-emerald-500/50 text-emerald-200 p-6 sm:p-7 rounded-3xl shadow-2xl shadow-emerald-950/40 animate-fade-in relative">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-500/30 shadow-inner">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-emerald-300">
                          {t('dashboard.redeemSuccess')}
                        </h3>
                        <p className="text-xs text-emerald-400/80">
                          {t('dashboard.redeemedAt') || 'Redeemed at'}: <strong className="text-white font-mono">{formatTime(redeemResult.redeemedAt)}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRedeemResult(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Redeem Next Voucher
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider mb-1">
                        Deal Title
                      </div>
                      <div className="text-lg sm:text-xl font-black text-white leading-tight">
                        {redeemResult.dealTitle || '-'}
                      </div>
                      {redeemResult.itemCode && (
                        <div className="text-xs font-mono text-emerald-300/80 mt-1.5 flex items-center gap-1">
                          <span>Item Code:</span> <span className="font-bold text-white px-1.5 py-0.5 rounded bg-emerald-500/20">{redeemResult.itemCode}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider mb-1">
                        Amount Paid (Cashless)
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                        {redeemResult.amount !== null && redeemResult.amount !== undefined ? (
                          <>
                            {redeemResult.amount} <span className="text-base font-bold text-emerald-300">ETB</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-400/70 font-semibold mt-1">
                        ✓ Settled via Safaricom M-PESA
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider mb-1">
                        Order Reference
                      </div>
                      <div className="text-xs sm:text-sm font-mono text-slate-300 break-all bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                        <span>{redeemResult.orderId || '-'}</span>
                        {redeemResult.orderId && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(redeemResult.orderId!);
                              setCopiedOrderId(true);
                              setTimeout(() => setCopiedOrderId(false), 2000);
                            }}
                            className="text-slate-400 hover:text-white p-1"
                            title="Copy Order ID"
                          >
                            {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Post Deal Success Alert Banner */}
            {postSuccessMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-semibold">{postSuccessMessage}</span>
              </div>
            )}

            {/* Post Deal Section (Live POST /api/merchant/deals) */}
            {isPostDealOpen && (
              <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">Post New Deal</h3>
                      <p className="text-xs text-slate-400">
                        Create a verified deal for nearby shoppers within 2 km.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPostDealOpen(false);
                      setPostError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                {postError && (
                  <div className="mb-5 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span className="font-semibold">{postError}</span>
                  </div>
                )}

                <form onSubmit={handlePostDealSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Deal Title (3-80 chars) *
                      </label>
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={80}
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        placeholder="e.g. 25% Off Fresh Roast Coffee & Pastry"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Price (ETB) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100000}
                          required
                          value={postPrice}
                          onChange={(e) => setPostPrice(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Discount ({postDiscountPct}%) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          required
                          value={postDiscountPct}
                          onChange={(e) => setPostDiscountPct(Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-[10px] text-slate-400 block mt-0.5">New shops: max 50%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Expiry Duration (Days) *</span>
                      </label>
                      <select
                        value={postExpiryDays}
                        onChange={(e) => setPostExpiryDays(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value={1}>1 Day</option>
                        <option value={3}>3 Days</option>
                        <option value={5}>5 Days</option>
                        <option value={7}>7 Days (New shop maximum)</option>
                        <option value={14}>14 Days</option>
                        <option value={30}>30 Days</option>
                      </select>
                      <span className="text-[10px] text-slate-400 block mt-0.5">New shops: up to 7 days only</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Item / Stock Code (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={postItemCode}
                        onChange={(e) => setPostItemCode(e.target.value.toUpperCase())}
                        placeholder="e.g. COFFEE-01"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono uppercase text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">3-20 letters/digits/dashes</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Final customer counter price:</span>
                    <span className="text-emerald-400 font-black text-sm">
                      {Math.round(postPrice * (1 - postDiscountPct / 100))} ETB
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={postLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {postLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Publishing deal to marketplace...</span>
                      </>
                    ) : (
                      <span>Publish Live Deal</span>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Live Deals Section (GET /api/merchant/deals) */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl overflow-hidden backdrop-blur-md shadow-xl">
              <div className="p-5 md:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                      <span>Active Shop Deals</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Live published offers shown to shoppers within 2 km
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPostDealOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Deal</span>
                </button>
              </div>

              {dealsLoading ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <p className="text-xs">Loading active deals...</p>
                </div>
              ) : deals.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No active deals posted yet. Click &quot;Post Deal&quot; to publish your first offer.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-950/70 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800/80">
                      <tr>
                        <th className="px-6 py-3.5">Deal</th>
                        <th className="px-6 py-3.5 text-right">Original Price</th>
                        <th className="px-6 py-3.5 text-center">Discount</th>
                        <th className="px-6 py-3.5 text-right">Final Amount</th>
                        <th className="px-6 py-3.5">Expires</th>
                        <th className="px-6 py-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {deals.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-3.5 font-bold font-sans text-white max-w-xs truncate">
                            <div>{d.title}</div>
                            {d.itemCode && (
                              <span className="text-[10px] text-slate-400 font-mono">Code: {d.itemCode}</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right text-slate-400 line-through">
                            {d.price} ETB
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <span className="px-2 py-0.5 rounded font-black bg-emerald-500/20 text-emerald-300">
                              {d.discountPct}% OFF
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right font-black text-amber-400">
                            {d.finalAmount} ETB
                          </td>
                          <td className="px-6 py-3.5 text-slate-300 font-sans text-xs">
                            {formatDate(d.expiryDate)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-sans">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              d.isActive
                                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                                : 'text-slate-400 bg-slate-800 border border-slate-700'
                            }`}>
                              {d.isActive ? 'Active' : 'Paused'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* Deals Redeemed */}
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                    {t('dashboard.dealsRedeemed')}
                  </span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-emerald-400 font-mono tracking-tight">
                  {animatedDealsRedeemed}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-2">
                  Counter verified vouchers
                </div>
              </div>

              {/* Cashless Sales */}
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                    {t('dashboard.cashlessSales')}
                  </span>
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-amber-400 font-mono tracking-tight truncate">
                  {animatedSales.toLocaleString()} <span className="text-lg sm:text-xl font-bold">ETB</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-2">
                  Cleared to M-PESA merchant till
                </div>
              </div>

              {/* Pending Orders */}
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-sky-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                    {t('dashboard.pending')}
                  </span>
                  <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-sky-400 font-mono tracking-tight">
                  {animatedPending}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-2">
                  Awaiting PIN STK on customer handset
                </div>
              </div>

              {/* Failed Orders */}
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-rose-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                    {t('dashboard.failed')}
                  </span>
                  <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-rose-400 font-mono tracking-tight">
                  {animatedFailed}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-2">
                  Declined or cancelled PIN requests
                </div>
              </div>
            </div>

            {/* Live Orders Stream List */}
            <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <span>{t('dashboard.recentOrders')}</span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Live Safaricom transaction receipts and redemption timeline
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Cashier Order Search */}
                  <div className="relative">
                    <input
                      type="text"
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      placeholder="Search deal or receipt..."
                      className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 min-h-[36px]"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Live Stream</span>
                  </div>
                </div>
              </div>

              {loading && !stats ? (
                <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-xs sm:text-sm">Loading transactions...</p>
                </div>
              ) : !stats?.recent || stats.recent.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs sm:text-sm">
                  {t('dashboard.noRecentOrders')}
                </div>
              ) : filteredRecentOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No orders match &quot;{orderSearchQuery}&quot;.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-950/70 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800/80">
                      <tr>
                        <th className="px-6 py-4">{t('dashboard.deal')}</th>
                        <th className="px-6 py-4 text-right">{t('dashboard.amount')}</th>
                        <th className="px-6 py-4">{t('dashboard.receipt')}</th>
                        <th className="px-6 py-4">{t('dashboard.paidAt')}</th>
                        <th className="px-6 py-4 font-mono text-slate-500">{t('dashboard.orderId')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredRecentOrders.map((order: DashboardOrder) => (
                        <tr key={order.orderId} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-white max-w-xs truncate">
                            {order.dealTitle || 'Deal'}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                            {order.amount.toLocaleString()} ETB
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-emerald-400">
                            {order.receipt ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                {order.receipt}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                            {formatTime(order.paidAt)}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                            {order.orderId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
      </main>
    </div>
  );
}
