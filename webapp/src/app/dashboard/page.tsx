'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import { useLanguage } from '@/context/LanguageContext';
import { fetchNearbyDeals } from '@/lib/api';
import { 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Store, 
  RefreshCw, 
  AlertCircle, 
  Loader2, 
  Activity,
  ArrowUpRight
} from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tirfmarket-backend.onrender.com';
const BOLE_LAT = 9.0000;
const BOLE_LON = 38.7800;

interface MerchantOption {
  id: string;
  name: string;
}

interface RecentTransaction {
  orderId: string;
  dealTitle?: string | null;
  amount: number;
  receipt?: string | null;
  paidAt: string;
}

interface MerchantStatsData {
  merchantId: string;
  dealsRedeemed: number;
  cashlessSales: number;
  pending: number;
  failed: number;
  recent: RecentTransaction[];
}

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
      // Cubic ease-out
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

  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');
  const [stats, setStats] = useState<MerchantStatsData | null>(null);
  const [loadingMerchants, setLoadingMerchants] = useState<boolean>(true);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [isWakingUp, setIsWakingUp] = useState<boolean>(false);
  const [errorStatus, setErrorStatus] = useState<'404' | 'network' | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Animated counters
  const animatedRedeemed = useAnimatedNumber(stats?.dealsRedeemed ?? 0);
  const animatedSales = useAnimatedNumber(stats?.cashlessSales ?? 0);
  const animatedPending = useAnimatedNumber(stats?.pending ?? 0);
  const animatedFailed = useAnimatedNumber(stats?.failed ?? 0);

  // Waking up server detector (shows message if loading > 5 seconds)
  useEffect(() => {
    if (!loadingStats && !loadingMerchants) return;
    const timer = setTimeout(() => {
      setIsWakingUp(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [loadingStats, loadingMerchants]);

  // Load merchants from Bole deals
  useEffect(() => {
    let isMounted = true;
    async function loadMerchants() {
      setLoadingMerchants(true);
      try {
        const deals = await fetchNearbyDeals(BOLE_LAT, BOLE_LON, 2000);
        if (!isMounted) return;

        const map = new Map<string, string>();
        deals.forEach((d) => {
          if (d.merchantId && d.merchantName) {
            map.set(d.merchantId, d.merchantName);
          }
        });

        const list: MerchantOption[] = Array.from(map.entries()).map(([id, name]) => ({
          id,
          name,
        }));

        setMerchants(list);

        // Check query param for merchantId
        const params = new URLSearchParams(window.location.search);
        const queryMerchantId = params.get('merchantId');

        if (queryMerchantId) {
          setSelectedMerchantId(queryMerchantId);
        } else if (list.length > 0) {
          setSelectedMerchantId(list[0].id);
        }
      } catch {
        // Fallback demo merchant if deals are unavailable
        if (isMounted) {
          const fallbackList = [
            { id: 'm0000000-0000-0000-0000-000000000001', name: 'Bole Burger Hub' },
            { id: 'm0000000-0000-0000-0000-000000000002', name: 'Tomoca Coffee Bole' }
          ];
          setMerchants(fallbackList);
          setSelectedMerchantId(fallbackList[0].id);
        }
      } finally {
        if (isMounted) {
          setLoadingMerchants(false);
          setIsWakingUp(false);
        }
      }
    }

    loadMerchants();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch stats for the selected merchant
  const fetchStats = useCallback(async (merchantId: string, isInitial: boolean = false) => {
    if (!merchantId) return;
    if (isInitial) setLoadingStats(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/merchants/${encodeURIComponent(merchantId)}/stats`);
      if (res.status === 404) {
        setErrorStatus('404');
        setStats(null);
        return;
      }
      if (!res.ok) {
        throw new Error(`Stats fetch failed (${res.status})`);
      }

      const data = await res.json();
      setStats(data);
      setErrorStatus(null);
      setLastUpdated(new Date());
    } catch {
      setErrorStatus('network');
    } finally {
      if (isInitial) setLoadingStats(false);
      setIsWakingUp(false);
    }
  }, []);

  // Handle merchant dropdown change
  const handleSelectMerchant = (newId: string) => {
    setSelectedMerchantId(newId);
    setErrorStatus(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('merchantId', newId);
      window.history.replaceState({}, '', url.toString());
    }
    fetchStats(newId, true);
  };

  // 3-second live polling with visibilitychange listener and cleanup
  useEffect(() => {
    if (!selectedMerchantId) return;

    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        fetchStats(selectedMerchantId, false);
      }, 3000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Visibility change handler: pause when tab is hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchStats(selectedMerchantId, false);
        startPolling();
      }
    };

    // Trigger initial fetch asynchronously
    const initialTimer = setTimeout(() => {
      fetchStats(selectedMerchantId, true);
    }, 0);

    // Start polling immediately if page is currently visible
    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedMerchantId, fetchStats]);

  const activeMerchantName = merchants.find((m) => m.id === selectedMerchantId)?.name || 'Selected Merchant';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-yellow-500 selection:text-black">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Top Pitch Header & Merchant Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-3">
                <Activity className="w-3.5 h-3.5 animate-pulse text-yellow-400" />
                Live Pitch Counter
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                {t("dashboard.title")}
              </h1>
              <p className="text-sm md:text-base text-slate-400 mt-2 flex items-center gap-2">
                <span>{activeMerchantName}</span>
                {lastUpdated && (
                  <span className="text-xs text-slate-500">
                    • Synced {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>

            {/* Merchant Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <label htmlFor="merchant-select" className="sr-only">
                  {t("dashboard.selectMerchant")}
                </label>
                <div className="flex items-center gap-2 bg-slate-800 border-2 border-slate-700 hover:border-yellow-400/50 rounded-2xl px-4 py-3 transition-colors">
                  <Store className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <select
                    id="merchant-select"
                    value={selectedMerchantId}
                    onChange={(e) => handleSelectMerchant(e.target.value)}
                    disabled={loadingMerchants}
                    className="bg-transparent text-white font-bold text-sm md:text-base focus:outline-none cursor-pointer pr-4"
                  >
                    {loadingMerchants ? (
                      <option className="bg-slate-900 text-white">Loading Bole merchants...</option>
                    ) : (
                      merchants.map((m) => (
                        <option key={m.id} value={m.id} className="bg-slate-900 text-white font-medium">
                          {m.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchStats(selectedMerchantId, true)}
                disabled={loadingStats}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 p-3 rounded-2xl transition-all flex items-center justify-center cursor-pointer active:scale-95"
                title="Refresh stats now"
                aria-label="Refresh stats"
              >
                <RefreshCw className={`w-5 h-5 ${loadingStats ? 'animate-spin text-yellow-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* STATE: WAKING UP SERVER */}
        {isWakingUp && (
          <div className="mb-8 bg-amber-500/10 border-2 border-amber-500/30 text-amber-300 px-6 py-4 rounded-2xl flex items-center gap-3 animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin flex-shrink-0 text-amber-400" />
            <div className="text-sm">
              <span className="font-bold">Server is waking up:</span>{' '}
              {t("dashboard.waking")}
            </div>
          </div>
        )}

        {/* STATE: 404 NOT ENABLED */}
        {errorStatus === '404' && (
          <div className="mb-10 bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-8 text-center max-w-xl mx-auto shadow-2xl">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              {t("dashboard.statsDisabled")}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              The merchant statistics module is not enabled for this merchant or endpoint on the live backend.
            </p>
            <button
              type="button"
              onClick={() => fetchStats(selectedMerchantId, true)}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t("deals.retry")}
            </button>
          </div>
        )}

        {/* STATE: NETWORK ERROR / OFFLINE */}
        {errorStatus === 'network' && (
          <div className="mb-10 bg-slate-900 border-2 border-rose-500/40 rounded-3xl p-8 text-center max-w-xl mx-auto shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              {t("dashboard.error")}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Unable to communicate with the server. Please check your connection or retry.
            </p>
            <button
              type="button"
              onClick={() => fetchStats(selectedMerchantId, true)}
              className="bg-rose-500 hover:bg-rose-400 text-white font-bold px-6 py-3 rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t("deals.retry")}
            </button>
          </div>
        )}

        {/* PROJECTOR-OPTIMIZED 4-METRIC GRID (High contrast, large fonts) */}
        {!errorStatus && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* 1. Deals Redeemed */}
            <div className="bg-slate-900 border-2 border-emerald-500/40 hover:border-emerald-500 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-400 mb-4">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {t("dashboard.dealsRedeemed")}
                </span>
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-5xl md:text-6xl lg:text-7xl font-black text-emerald-400 tracking-tight my-2">
                {animatedRedeemed.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Verified customer vouchers
              </p>
            </div>

            {/* 2. Cashless Sales (M-Pesa) */}
            <div className="bg-slate-900 border-2 border-yellow-500/40 hover:border-yellow-500 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-yellow-400 mb-4">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                  {t("dashboard.cashlessSales")}
                </span>
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="text-4xl md:text-5xl lg:text-6xl font-black text-yellow-400 tracking-tight my-2 truncate">
                {animatedSales.toLocaleString()} <span className="text-2xl lg:text-3xl font-extrabold text-yellow-500">ETB</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Settled instantly via M-PESA
              </p>
            </div>

            {/* 3. Pending Orders */}
            <div className="bg-slate-900 border-2 border-amber-500/40 hover:border-amber-500 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-400 mb-4">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  {t("dashboard.pending")}
                </span>
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-5xl md:text-6xl lg:text-7xl font-black text-amber-400 tracking-tight my-2">
                {animatedPending.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Awaiting STK PIN entry
              </p>
            </div>

            {/* 4. Failed Attempts */}
            <div className="bg-slate-900 border-2 border-rose-500/40 hover:border-rose-500 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-400 mb-4">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                  {t("dashboard.failed")}
                </span>
                <XCircle className="w-6 h-6" />
              </div>
              <div className="text-5xl md:text-6xl lg:text-7xl font-black text-rose-400 tracking-tight my-2">
                {animatedFailed.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Cancelled or timed out
              </p>
            </div>
          </div>
        )}

        {/* RECENT TRANSACTIONS TABLE */}
        {!errorStatus && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white">
                  {t("dashboard.recentActivity")}
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  Live Feed
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Auto-polls every 3s
              </span>
            </div>

            {stats && stats.recent && stats.recent.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th scope="col" className="px-4 py-3.5 rounded-l-xl">{t("dashboard.orderId")}</th>
                      <th scope="col" className="px-4 py-3.5">{t("dashboard.dealTitle")}</th>
                      <th scope="col" className="px-4 py-3.5">{t("dashboard.amount")}</th>
                      <th scope="col" className="px-4 py-3.5">{t("dashboard.receipt")}</th>
                      <th scope="col" className="px-4 py-3.5 rounded-r-xl">{t("dashboard.paidAt")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs md:text-sm">
                    {stats.recent.map((tx) => (
                      <tr key={tx.orderId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-4 font-bold text-slate-300">
                          {tx.orderId.length > 12 ? `${tx.orderId.slice(0, 8)}...${tx.orderId.slice(-4)}` : tx.orderId}
                        </td>
                        <td className="px-4 py-4 font-sans text-white font-medium">
                          {tx.dealTitle || 'Marketplace Deal'}
                        </td>
                        <td className="px-4 py-4 font-bold text-yellow-400">
                          {tx.amount} ETB
                        </td>
                        <td className="px-4 py-4">
                          {tx.receipt ? (
                            <span className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/30 text-green-400 px-2.5 py-1 rounded-md font-bold text-xs">
                              {tx.receipt}
                              <ArrowUpRight className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-400 font-sans text-xs">
                          {tx.paidAt ? new Date(tx.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 font-medium">
                {t("dashboard.noRecent")}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
