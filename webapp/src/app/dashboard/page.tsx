'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import {
  isMockDashboard,
  getStoredToken,
  clearStoredToken,
  requestAuthCode,
  verifyAuthCode,
  fetchMerchantMe,
  fetchDashboardStats,
  DashboardStats,
  DashboardOrder,
  MerchantMe,
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
  Sparkles,
  ChevronDown,
  Store,
  Tag,
  Search,
  ExternalLink,
  Copy,
  Check,
  Receipt,
  Ticket,
  Star,
  Plus,
} from 'lucide-react';
import {
  getRatingForMerchant,
  getReviewsForMerchant,
  verifyClaimCodeForMerchant,
  payClaimTicketAtShop,
  markClaimTicketRedeemed,
  setCustomDealQuota,
  getDealQuota,
  getStoredDealQuotas,
  getAllDealQuotasSummary,
  checkAndExpireClaims,
  CustomerClaimTicket,
} from '@/lib/claimsStorage';

// Smooth animated number hook using requestAnimationFrame with cubic ease-out
function useAnimatedNumber(target: number, duration: number = 650): number {
  const [current, setCurrent] = useState<number>(target);
  const prevRef = useRef<number>(target);

  useEffect(() => {
    const start = prevRef.current;
    const end = target;
    prevRef.current = target;
    if (start === end) return;

    const startTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + (end - start) * ease));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return current;
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const isMock = isMockDashboard();

  // Authentication State (Real Mode)
  const [token, setToken] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<MerchantMe | null>(() => {
    if (isMock) {
      return {
        id: 'mock-sample-merchant',
        shopName: 'Bole Highland Cafe',
        name: 'Bole Highland Cafe',
        category: 'cafe',
        status: 'approved',
        rejectionReason: null,
      };
    }
    return null;
  });
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

  // Redeem Code State
  const [redeemCodeInput, setRedeemCodeInput] = useState<string>('');
  const [redeemLoading, setRedeemLoading] = useState<boolean>(false);
  const [redeemResult, setRedeemResult] = useState<RedeemResponse | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<boolean>(false);

  // Orders Search Query
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');

  // Post Deal Quotas & Validity State
  const [isPostDealOpen, setIsPostDealOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postOriginalPrice, setPostOriginalPrice] = useState<number>(200);
  const [postDiscountPct, setPostDiscountPct] = useState<number>(25);
  const [postQuota, setPostQuota] = useState<number>(10); // Amount of discounts present
  const [postHoldMinutes, setPostHoldMinutes] = useState<number>(30); // Given validity time from merchant
  const [postSuccessMessage, setPostSuccessMessage] = useState<string | null>(null);

  // Cashier Counter Active Hold Verification
  const [counterClaim, setCounterClaim] = useState<{
    status: 'claimed_active' | 'paid_ready' | 'already_redeemed' | 'expired' | 'not_found';
    ticket?: CustomerClaimTicket;
    message: string;
  } | null>(null);

  // Animated counters
  const animatedDealsRedeemed = useAnimatedNumber(stats?.dealsRedeemed ?? 0);
  const animatedSales = useAnimatedNumber(stats?.cashlessSales ?? 0);
  const animatedPending = useAnimatedNumber(stats?.pending ?? 0);
  const animatedFailed = useAnimatedNumber(stats?.failed ?? 0);

  // Format order date/time safely on client
  const formatTime = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  // Synchronize reviews & quotas from claim tickets storage in real-time
  const [reviewsVersion, setReviewsVersion] = useState(0);
  useEffect(() => {
    checkAndExpireClaims();
    const handleUpdate = () => setReviewsVersion((v) => v + 1);
    window.addEventListener('tirf_claims_updated', handleUpdate);
    window.addEventListener('tirf_quota_updated', handleUpdate);
    const interval = setInterval(() => {
      checkAndExpireClaims();
    }, 4000);
    return () => {
      window.removeEventListener('tirf_claims_updated', handleUpdate);
      window.removeEventListener('tirf_quota_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const merchantShopName = merchant?.shopName || merchant?.name || 'Bole Highland Cafe';
  const merchantRating = useMemo(() => getRatingForMerchant(merchantShopName), [merchantShopName, reviewsVersion]);
  const merchantReviews = useMemo(() => getReviewsForMerchant(merchantShopName), [merchantShopName, reviewsVersion]);
  const merchantQuotas = useMemo(() => getAllDealQuotasSummary(), [reviewsVersion]);

  // Waking server detection (> 5s loading)
  useEffect(() => {
    if (!loading) {
      return;
    }
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

  // Initial Load: check stored token or init mock mode
  useEffect(() => {
    const init = async () => {
      if (isMock) {
        await fetchStats(undefined, true);
        return;
      }

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
  }, [isMock, fetchStats]);

  // Polling Interval: refresh stats every 3 seconds while approved
  useEffect(() => {
    const currentStatus = (statusOverride || merchant?.status || 'approved') as MerchantStatus;
    if (currentStatus !== 'approved') return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStats(token || undefined, false);
      }
    }, 3000);

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
      await requestAuthCode(emailInput);
      setAuthMessage(t('dashboard.codeSent'));
      setCodeSent(true);
    } catch (err: unknown) {
      if (err instanceof DashboardApiError && err.status === 429) {
        setAuthError(t('dashboard.tooManyAttempts'));
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
        if (result.status === 429) {
          setAuthError(t('dashboard.tooManyAttempts'));
        } else {
          setAuthError(result.error);
        }
        return;
      }

      if (result.token) {
        setToken(result.token);
        setLoading(true);
        const me = await fetchMerchantMe(result.token);
        setMerchant(me);
        if (me.status === 'approved') {
          await fetchStats(result.token, true);
        }
      }
    } catch (err: unknown) {
      if (err instanceof DashboardApiError && err.status === 429) {
        setAuthError(t('dashboard.tooManyAttempts'));
      } else {
        setAuthError('Authentication failed. Please verify your code and retry.');
      }
    } finally {
      setAuthLoading(false);
      setLoading(false);
    }
  };

  // Handle Post Deal with Quotas and Validity Duration
  const handlePostDealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || postOriginalPrice <= 0 || postQuota <= 0) return;

    const dealId = `d_custom_${Date.now()}`;
    setCustomDealQuota(
      dealId,
      Number(postQuota),
      Number(postHoldMinutes),
      merchantShopName,
      postTitle.trim()
    );

    setPostSuccessMessage(`Deal published! Quota of ${postQuota} discounts present with ${postHoldMinutes}m claim validity window.`);
    setTimeout(() => setPostSuccessMessage(null), 5000);
    setPostTitle('');
    setIsPostDealOpen(false);
  };

  // Cashier confirms payment made at counter
  const handleConfirmCounterPayment = (ticket: CustomerClaimTicket) => {
    payClaimTicketAtShop(ticket.id);
    markClaimTicketRedeemed(ticket.id);
    setCounterClaim(null);
    setRedeemResult({
      orderId: ticket.orderId,
      dealTitle: ticket.dealTitle,
      amount: ticket.amount,
      redeemedAt: new Date().toISOString(),
      isSample: true,
    });
    if (isMock || token) {
      fetchStats(token || undefined, false);
    }
  };

  // Handle Redeem / Verify Code
  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = redeemCodeInput.trim().toUpperCase();
    if (!code) return;

    setRedeemLoading(true);
    setRedeemError(null);
    setRedeemResult(null);
    setCounterClaim(null);

    // Clear input after each attempt (Requirement: "Clear input after each attempt")
    setRedeemCodeInput('');

    // Check local customer claim tickets
    const localCheck = verifyClaimCodeForMerchant(code, merchantShopName);
    if (localCheck.status !== 'not_found') {
      setRedeemLoading(false);

      if (localCheck.status === 'claimed_active' && localCheck.ticket) {
        setCounterClaim(localCheck);
        return;
      }
      if (localCheck.status === 'paid_ready' && localCheck.ticket) {
        markClaimTicketRedeemed(localCheck.ticket.id);
        setRedeemResult({
          orderId: localCheck.ticket.orderId,
          dealTitle: localCheck.ticket.dealTitle,
          amount: localCheck.ticket.amount,
          redeemedAt: new Date().toISOString(),
          isSample: true,
        });
        if (isMock || token) {
          fetchStats(token || undefined, false);
        }
        return;
      }
      if (localCheck.status === 'expired') {
        setRedeemError(localCheck.message);
        return;
      }
      if (localCheck.status === 'already_redeemed') {
        setRedeemError(localCheck.message);
        return;
      }
    }

    try {
      const result = await redeemDealCode(code, token || undefined);
      setRedeemResult(result);
      if (isMock || token) {
        fetchStats(token || undefined, false);
      }
    } catch (err: unknown) {
      if (err instanceof DashboardApiError) {
        if (err.status === 401) {
          clearStoredToken();
          setToken(null);
          setMerchant(null);
          setStats(null);
          return;
        }
        if (err.status === 404) {
          setRedeemError(t('dashboard.codeNotFound') || 'Code not found for this shop');
          return;
        }
        if (err.status === 409) {
          setRedeemError(t('dashboard.codeAlreadyUsed') || 'This code was already used');
          return;
        }
        setRedeemError(err.message || t('dashboard.redeemError') || 'Could not redeem code. Please try again.');
      } else {
        setRedeemError(t('dashboard.redeemError') || 'Could not redeem code. Please try again.');
      }
    } finally {
      setRedeemLoading(false);
    }
  };

  // Handle Log Out
  const handleLogout = () => {
    clearStoredToken();
    setToken(null);
    setMerchant(null);
    setStats(null);
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

  // Render Login Form in Real Mode when unauthenticated
  if (!isMock && !token) {
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
                      placeholder="shop@example.com"
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
  const isStatusBlocked = !isMock && currentStatus !== 'approved';

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
                    {merchant?.shopName || 'Merchant Portal'}
                  </span>
                  {isMock && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                      <Sparkles className="w-2.5 h-2.5" />
                      DEMO
                    </span>
                  )}
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
              <span>Live Counter Feed: <strong className="text-emerald-400 font-mono">Real-time</strong></span>
            </div>

            {/* Offline Alert */}
            {isOffline && (
              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-xl">
                {t('dashboard.offline')}
              </span>
            )}

            {/* Logout button (Real mode) */}
            {!isMock && token && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('dashboard.logout')}</span>
              </button>
            )}

            {/* Quick Link to Marketplace */}
            <Link
              href="/"
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-850 hover:to-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/80 shadow-xs transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Marketplace</span>
            </Link>

            {/* Post Deal (Quotas & Validity) Button */}
            <button
              type="button"
              onClick={() => setIsPostDealOpen((prev) => !prev)}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isPostDealOpen ? 'Close Post Deal' : 'Post Deal'}</span>
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-2xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{merchantRating.average.toFixed(1)}</span>
                    <span className="text-slate-400 font-normal">({merchantRating.count} reviews)</span>
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
              <div id="shop-profile-panel" className="px-5 pb-5 pt-3 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm animate-fade-in">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('register.shopName') || 'Shop Name'}
                  </div>
                  <div className="font-bold text-white text-base">
                    {merchant.shopName || merchant.name || 'Bole Highland Cafe'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Customer Rating
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 text-base flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      {merchantRating.average.toFixed(1)} / 5.0
                    </span>
                    <span className="text-xs text-slate-400">({merchantRating.count} reviews)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('dashboard.category') || 'Category'}
                  </div>
                  <div className="font-medium text-slate-200 capitalize">
                    {merchant.category ? (t(`cat.${merchant.category}` as unknown as Parameters<typeof t>[0]) || merchant.category) : 'Cafe'}
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

        {/* Status Screen (pending, rejected, suspended in Real Mode) */}
        {isStatusBlocked ? (
          <div className="max-w-xl mx-auto my-16 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-10 text-center shadow-2xl">
            {currentStatus === 'pending' ? (
              <>
                <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-pulse" />
                <h2 className="text-2xl font-bold text-white mb-2">{t('dashboard.waitingApproval')}</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Your merchant verification request has been received and is currently under review by our operations
                  team.
                </p>
              </>
            ) : currentStatus === 'rejected' ? (
              <>
                <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">{t('dashboard.statusRejected')}</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Your merchant registration could not be approved at this time. Please contact support.
                </p>
              </>
            ) : (
              <>
                <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">{t('dashboard.statusSuspended')}</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  This merchant account has been temporarily suspended. Please reach out to administration.
                </p>
              </>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              {t('dashboard.logout')}
            </button>
          </div>
        ) : (
          <>
            {/* HERO COMPONENT: Voucher Redemption Counter Box (Phone on counter / projector friendly) */}
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
                      {isMock && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                          <Sparkles className="w-3 h-3" />
                          {t('dashboard.sampleData')}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-400">
                      {t('dashboard.redeemSubtitle')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Fast Sample Code Chips (in Mock/Demo Mode) */}
              {isMock && (
                <div className="mb-5 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-2.5">
                  <span className="font-bold flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Quick-Select Test Voucher:</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { code: 'SAMPLE-ORD-01', label: 'SAMPLE-ORD-01' },
                      { code: 'SAMPLE-ORD-02', label: 'SAMPLE-ORD-02' },
                      { code: 'SAMPLE-ORD-03', label: 'SAMPLE-ORD-03' },
                      { code: 'TIRF-8F1A01', label: 'TIRF-8F1A01 (Paid)' },
                      { code: 'TIRF-7X9P', label: 'TIRF-7X9P (Active Hold)' },
                    ].map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setRedeemCodeInput(item.code)}
                        className={`px-2.5 py-1 font-mono text-xs font-black rounded-lg transition-all active:scale-95 cursor-pointer shadow-xs ${
                          item.code === 'TIRF-7X9P'
                            ? 'bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-500/50'
                            : 'bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Input & Action Button */}
              <form onSubmit={handleRedeemCode} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={redeemCodeInput}
                    onChange={(e) => setRedeemCodeInput(e.target.value.toUpperCase())}
                    placeholder={t('dashboard.redeemPlaceholder')}
                    disabled={redeemLoading}
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

              {/* Active Counter Hold Verification Card */}
              {counterClaim && counterClaim.ticket && (
                <div className="mt-5 bg-gradient-to-br from-amber-950/60 via-slate-900/95 to-amber-950/40 border-2 border-amber-500/60 text-amber-200 p-6 sm:p-7 rounded-3xl shadow-2xl shadow-amber-950/50 animate-fade-in relative">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-500/40 shadow-inner">
                        <Clock className="w-7 h-7 animate-pulse text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg sm:text-xl font-black text-amber-300">
                            Active Customer Hold • Pay at Shop
                          </h3>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                            Zero Upfront Claim
                          </span>
                        </div>
                        <p className="text-xs text-amber-400/80 mt-0.5">
                          {counterClaim.message}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCounterClaim(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                    <div>
                      <div className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider mb-1">
                        Reserved Deal
                      </div>
                      <div className="text-lg sm:text-xl font-black text-white leading-tight">
                        {counterClaim.ticket.dealTitle}
                      </div>
                      <div className="text-xs font-mono text-amber-300/80 mt-1.5 flex items-center gap-1.5">
                        <span>Code:</span>
                        <span className="font-black text-amber-200 px-2 py-0.5 rounded bg-amber-500/20 tracking-wider">
                          {counterClaim.ticket.redemptionCode}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider mb-1">
                        Amount to Collect at Counter
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight">
                        {counterClaim.ticket.amount.toLocaleString()} <span className="text-base font-bold text-amber-200">ETB</span>
                      </div>
                      <div className="text-[11px] text-amber-400/70 font-semibold mt-1">
                        Original: <span className="line-through">{counterClaim.ticket.originalPrice || counterClaim.ticket.amount} ETB</span> ({counterClaim.ticket.discountPct || 0}% OFF)
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-wider mb-1">
                        Validity Window & Quota Rule
                      </div>
                      <div className="text-xs font-medium text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-amber-500/20 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Merchant Hold:</span>
                          <span className="font-bold text-amber-300">{counterClaim.ticket.holdMinutes || 30} minutes</span>
                        </div>
                        <div className="text-[10px] text-amber-400/80 leading-tight">
                          If customer leaves without paying, quota automatically returns to your store stock.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cashier Confirmation Action */}
                  <div className="pt-4 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-amber-300/90 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Customer presents M-PESA or cash at counter. Once received, confirm below:</span>
                    </p>

                    <button
                      type="button"
                      onClick={() => handleConfirmCounterPayment(counterClaim.ticket!)}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-5 h-5 text-white" />
                      <span>Confirm Counter Payment & Settle</span>
                    </button>
                  </div>
                </div>
              )}

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

                    <div className="flex items-center gap-2">
                      {redeemResult.isSample && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                          <Sparkles className="w-3 h-3" />
                          {t('dashboard.sampleData')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setRedeemResult(null)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Redeem Next Voucher
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-400/80 uppercase tracking-wider mb-1">
                        Deal Title
                      </div>
                      <div className="text-lg sm:text-xl font-black text-white leading-tight">
                        {redeemResult.dealTitle}
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
                        {redeemResult.amount.toLocaleString()} <span className="text-base font-bold text-emerald-300">ETB</span>
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
                        <span>{redeemResult.orderId}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(redeemResult.orderId);
                            setCopiedOrderId(true);
                            setTimeout(() => setCopiedOrderId(false), 2000);
                          }}
                          className="text-slate-400 hover:text-white p-1"
                          title="Copy Order ID"
                        >
                          {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
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

            {/* Merchant Post Deal Section with Quota & Validity Duration */}
            {isPostDealOpen && (
              <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">Post Deal with Quota & Claim Validity</h3>
                      <p className="text-xs text-slate-400">Configure discounts present and set how long claims remain valid before reversing.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPostDealOpen(false)}
                    className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                <form onSubmit={handlePostDealSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Deal Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        placeholder="e.g. 25% Off Fresh Roast Coffee & Pastry"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Original Price (ETB) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={postOriginalPrice}
                          onChange={(e) => setPostOriginalPrice(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Discount ({postDiscountPct}%)
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={90}
                          value={postDiscountPct}
                          onChange={(e) => setPostDiscountPct(Math.max(5, Math.min(90, parseInt(e.target.value) || 5)))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quota & Validity Window Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
                    <div>
                      <label className="block text-xs font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                        <span>Discounts Present (Total Quota Available) *</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        required
                        value={postQuota}
                        onChange={(e) => setPostQuota(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Total discounts posted. Buyers claim with zero upfront payment.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                        <span>Claim Hold Validity Duration (Merchant Window) *</span>
                      </label>
                      <select
                        value={postHoldMinutes}
                        onChange={(e) => setPostHoldMinutes(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                      >
                        <option value={15}>15 Minutes</option>
                        <option value={20}>20 Minutes</option>
                        <option value={30}>30 Minutes (Recommended)</option>
                        <option value={45}>45 Minutes</option>
                        <option value={60}>60 Minutes (1 Hour)</option>
                        <option value={120}>120 Minutes (2 Hours)</option>
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        If buyer does not pay at counter within this time, quota automatically reverses back to your store!
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Final customer counter price:</span>
                    <span className="text-emerald-400 font-black text-sm">
                      {Math.round(postOriginalPrice * (1 - postDiscountPct / 100))} ETB
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    Publish Deal & Activate Quota
                  </button>
                </form>
              </div>
            )}

            {/* Deal Quotas & Counter Holds Real-Time Inventory Table */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl overflow-hidden backdrop-blur-md shadow-xl">
              <div className="p-5 md:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base md:text-lg flex items-center gap-2">
                      <span>Posted Deals, Quotas & Claim Holds</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time inventory: discounts present, active counter holds, and auto-reversals
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPostDealOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Another Deal</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950/70 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800/80">
                    <tr>
                      <th className="px-6 py-3.5">Deal</th>
                      <th className="px-6 py-3.5 text-center">Discounts Present</th>
                      <th className="px-6 py-3.5 text-center">Available Quota</th>
                      <th className="px-6 py-3.5 text-center">Active Holds</th>
                      <th className="px-6 py-3.5 text-center">Paid / Redeemed</th>
                      <th className="px-6 py-3.5 text-center">Hold Validity</th>
                      <th className="px-6 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {merchantQuotas.map((q) => (
                      <tr key={q.dealId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3.5 font-bold font-sans text-white max-w-xs truncate">
                          {q.dealTitle || 'Special Offer'}
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-slate-300">
                          {q.totalQuota}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded font-black ${
                            q.availableQuota > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {q.availableQuota} left
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {q.activeHolds > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold animate-pulse">
                              {q.activeHolds} pending pay
                            </span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center text-slate-400">
                          {q.paidCount}
                        </td>
                        <td className="px-6 py-3.5 text-center text-slate-300">
                          {q.holdMinutes} min
                        </td>
                        <td className="px-6 py-3.5 text-right font-sans">
                          {q.isSoldOut ? (
                            <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                              All Claimed
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              Available
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Primary Metrics Grid (High-Contrast Projector Cards) */}
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

            {/* Customer Reviews & Feedback Card */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl overflow-hidden backdrop-blur-md shadow-xl space-y-0">
              <div className="p-5 md:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                    <Star className="w-5 h-5 fill-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-base md:text-lg">
                        Customer Reviews & Counter Feedback
                      </h3>
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {merchantRating.average.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ratings and comments left by buyers who visited your counter
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  {merchantReviews.length} total reviews
                </div>
              </div>

              {merchantReviews.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No reviews submitted yet for this shop.
                </div>
              ) : (
                <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {merchantReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                            {rev.authorName ? rev.authorName.charAt(0).toUpperCase() : 'B'}
                          </div>
                          <span className="text-xs font-bold text-white">{rev.authorName}</span>
                          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            Verified M-PESA
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {rev.dealTitle && (
                        <div className="text-[11px] font-medium text-emerald-400 truncate">
                          {rev.dealTitle}
                        </div>
                      )}

                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        "{rev.comment}"
                      </p>

                      <div className="text-[10px] text-slate-500 font-mono">
                        {formatTime(rev.date)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
