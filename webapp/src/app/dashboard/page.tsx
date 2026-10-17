'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';

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
  const [merchant, setMerchant] = useState<MerchantMe | null>(null);
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

  // Fetch stats function
  const fetchStats = useCallback(
    async (currentToken?: string, isInitial: boolean = false) => {
      if (isInitial) setLoading(true);

      try {
        const data = await fetchDashboardStats(currentToken);
        setStats(data);
        setErrorMessage(null);
        setStatusOverride(null);
      } catch (err: unknown) {
        if (err instanceof DashboardApiError) {
          if (err.status === 401) {
            setToken(null);
            clearStoredToken();
            setStats(null);
            return;
          }
          if (err.status === 403) {
            setStatusOverride(err.merchantStatus || 'suspended');
            return;
          }
          setErrorMessage(err.message);
        } else {
          setErrorMessage(t('dashboard.error'));
        }
      } finally {
        if (isInitial) {
          setLoading(false);
          setIsWakingUp(false);
        }
      }
    },
    [t]
  );

  // Initialize page on mount
  useEffect(() => {
    if (isMock) {
      // In Mock Mode: skip login form, load initial stats immediately
      const initTimer = setTimeout(() => {
        fetchStats(undefined, true);
      }, 0);

      // Start 3-second live polling
      const pollInterval = setInterval(() => {
        if (!document.hidden) {
          fetchStats(undefined, false);
        }
      }, 3000);

      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchStats(undefined, false);
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearTimeout(initTimer);
        clearInterval(pollInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    // In Real Mode: check stored token in sessionStorage
    const realTimer = setTimeout(() => {
      const stored = getStoredToken();
      if (stored) {
        setToken(stored);
        fetchMerchantMe(stored)
          .then((me) => {
            setMerchant(me);
            if (me.status === 'approved') {
              fetchStats(stored, true);
            } else {
              setLoading(false);
            }
          })
          .catch((err) => {
            if (err?.status === 401) {
              setToken(null);
              clearStoredToken();
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    }, 0);

    return () => {
      clearTimeout(realTimer);
    };
  }, [isMock, fetchStats]);

  // Polling in Real Mode once token is approved
  useEffect(() => {
    if (isMock || !token || merchant?.status !== 'approved') return;

    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        fetchStats(token, false);
      }
    }, 3000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStats(token, false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMock, token, merchant, fetchStats]);

  // Handle Send Code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      const res = await requestAuthCode(emailInput);
      setCodeSent(true);
      setAuthMessage(res.message || t('dashboard.codeSent'));
    } catch (err: unknown) {
      if (err instanceof DashboardApiError && err.status === 429) {
        setAuthError(t('dashboard.tooManyAttempts'));
      } else {
        setAuthMessage(t('dashboard.codeSent'));
        setCodeSent(true);
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
  };

  // Render Login Form in Real Mode when unauthenticated
  if (!isMock && !token) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tirf Market</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-yellow-400">Tirf</span> Market
            </span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">{t('dashboard.loginTitle')}</h1>
              <p className="text-slate-400 text-sm">{t('dashboard.loginSubtitle')}</p>
            </div>

            {authError && (
              <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            {authMessage && (
              <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-sm flex items-start gap-3">
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
                      placeholder="merchant@business.et"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors pl-11"
                    />
                    <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 disabled:opacity-50"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading || codeInput.length !== 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 disabled:opacity-50"
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
          </div>
        </main>
      </div>
    );
  }

  // Active status check for Real Mode
  const currentStatus = statusOverride || merchant?.status;
  const isStatusBlocked = !isMock && currentStatus && currentStatus !== 'approved';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans pb-16 selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Projector Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider py-1.5 px-2.5 rounded-lg hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Site</span>
            </Link>

            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-1.5">
                <span className="text-yellow-400">Tirf</span> Market{' '}
                <span className="text-slate-400 font-semibold text-sm md:text-lg">Dashboard</span>
              </h1>

              {/* Sample Data Badge (Always visible in mock mode) */}
              {isMock && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3 h-3" />
                  {t('dashboard.sampleData')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real Mode Log Out Button */}
            {!isMock && token && (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('dashboard.logout')}</span>
              </button>
            )}

            {/* Offline Badge */}
            {isOffline && (
              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-md">
                {t('dashboard.offline')}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 mt-8 flex-1">
        {/* Waking Server Banner */}
        {isWakingUp && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-xl text-sm flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400 shrink-0" />
            <span>{t('dashboard.waking')}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => fetchStats(token || undefined, true)}
              className="inline-flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('dashboard.retry')}</span>
            </button>
          </div>
        )}

        {/* Status Screen (pending, rejected, suspended in Real Mode) */}
        {isStatusBlocked ? (
          <div className="max-w-xl mx-auto my-16 bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center shadow-2xl">
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
            {/* Primary Metrics Grid (High-Contrast Projector Cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              {/* Deals Redeemed */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-4">
                  <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-400">
                    {t('dashboard.dealsRedeemed')}
                  </span>
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-5xl md:text-6xl font-black text-emerald-400 font-mono tracking-tight">
                  {animatedDealsRedeemed}
                </div>
              </div>

              {/* Cashless Sales */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-4">
                  <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-400">
                    {t('dashboard.cashlessSales')}
                  </span>
                  <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl md:text-5xl lg:text-6xl font-black text-amber-400 font-mono tracking-tight truncate">
                  {animatedSales.toLocaleString()} <span className="text-xl md:text-2xl font-bold">ETB</span>
                </div>
              </div>

              {/* Pending Orders */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-sky-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-4">
                  <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-400">
                    {t('dashboard.pending')}
                  </span>
                  <div className="p-2 bg-sky-500/10 rounded-xl text-sky-400">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-5xl md:text-6xl font-black text-sky-400 font-mono tracking-tight">
                  {animatedPending}
                </div>
              </div>

              {/* Failed Orders */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-rose-500/40 transition-all">
                <div className="flex items-center justify-between text-slate-400 mb-4">
                  <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-400">
                    {t('dashboard.failed')}
                  </span>
                  <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-5xl md:text-6xl font-black text-rose-400 font-mono tracking-tight">
                  {animatedFailed}
                </div>
              </div>
            </div>

            {/* Recent Orders List */}
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>{t('dashboard.recentOrders')}</span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Live Feed</span>
                </div>
              </div>

              {loading && !stats ? (
                <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-sm">Loading transactions...</p>
                </div>
              ) : !stats?.recent || stats.recent.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-sm">
                  {t('dashboard.noRecentOrders')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-4">{t('dashboard.deal')}</th>
                        <th className="px-6 py-4 text-right">{t('dashboard.amount')}</th>
                        <th className="px-6 py-4">{t('dashboard.receipt')}</th>
                        <th className="px-6 py-4">{t('dashboard.paidAt')}</th>
                        <th className="px-6 py-4 font-mono text-slate-500">{t('dashboard.orderId')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {stats.recent.map((order: DashboardOrder) => (
                        <tr key={order.orderId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-medium text-white max-w-xs truncate">
                            {order.dealTitle || 'Deal'}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                            {order.amount.toLocaleString()} ETB
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-emerald-400">
                            {order.receipt || <span className="text-slate-600">-</span>}
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
          </>
        )}
      </main>
    </div>
  );
}
