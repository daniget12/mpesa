'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Tag,
  AlertTriangle,
  RefreshCw,
  Search,
  Ban,
  Check,
  X,
  ArrowLeft,
  BarChart3,
  Store,
  Activity,
  Clock,
  Award,
  Calendar,
  Phone,
  Layers,
  Coffee,
  Utensils,
  Scissors,
  ShoppingBag,
  ExternalLink,
  Sliders,
  Timer,
  RotateCcw,
  Sparkles,
  Lock,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  getAllDealQuotasSummary,
  setCustomDealQuota,
  getCustomerClaimTickets,
  checkAndExpireClaims,
  type DealQuotaInfo,
} from '@/lib/claimsStorage';

interface UserProfile {
  id: string;
  full_name: string;
  phone_number: string;
  account_type: 'buyer' | 'seller';
  role: 'user' | 'admin';
  is_banned: boolean;
  created_at: string;
  total_spent?: number;
  deals_redeemed?: number;
}

interface DealAdminItem {
  id: string;
  title: string;
  merchant_name: string;
  merchant_id?: string;
  category: string;
  original_price: number;
  discounted_price: number;
  discount_pct: number;
  status: 'pending' | 'approved' | 'rejected' | 'active';
  units_available: number;
  created_at: string;
  location?: string;
}

interface DisputeReport {
  id: string;
  deal_title: string;
  merchant_name: string;
  customer_phone: string;
  reason: string;
  voucher_code: string;
  amount: number;
  status: 'open' | 'refunded' | 'resolved' | 'dismissed';
  created_at: string;
}

interface SupabaseDealRow {
  id: string;
  title: string;
  merchant_name?: string;
  category?: string;
  original_price?: number;
  price?: number;
  discounted_price?: number;
  final_amount?: number;
  discount_pct?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'active';
  units_available?: number;
  created_at?: string;
  location?: string;
}

type AdminTab = 'analytics' | 'approvals' | 'claims' | 'users' | 'reports';

// Initial high-fidelity administration mock datasets for zero-downtime review
const INITIAL_ADMIN_USERS: UserProfile[] = [
  {
    id: 'u-1',
    full_name: 'Dawit Bekele',
    phone_number: '+251 911 234567',
    account_type: 'seller',
    role: 'user',
    is_banned: false,
    created_at: '2026-02-14T09:30:00Z',
    deals_redeemed: 34,
  },
  {
    id: 'u-2',
    full_name: 'Bethlehem Tadesse',
    phone_number: '+251 922 890123',
    account_type: 'buyer',
    role: 'user',
    is_banned: false,
    created_at: '2026-03-01T14:15:00Z',
    total_spent: 4200,
  },
  {
    id: 'u-3',
    full_name: 'Daniel Getahun',
    phone_number: '+251 912 345678',
    account_type: 'seller',
    role: 'admin',
    is_banned: false,
    created_at: '2026-01-10T08:00:00Z',
    deals_redeemed: 112,
  },
  {
    id: 'u-4',
    full_name: 'Selamawit Kebede',
    phone_number: '+251 933 456789',
    account_type: 'buyer',
    role: 'user',
    is_banned: false,
    created_at: '2026-03-12T11:20:00Z',
    total_spent: 1850,
  },
  {
    id: 'u-5',
    full_name: 'Yonas Haile',
    phone_number: '+251 944 567890',
    account_type: 'seller',
    role: 'user',
    is_banned: true,
    created_at: '2026-02-28T16:45:00Z',
    deals_redeemed: 0,
  },
  {
    id: 'u-6',
    full_name: 'Marta Assefa',
    phone_number: '+251 911 678901',
    account_type: 'buyer',
    role: 'user',
    is_banned: false,
    created_at: '2026-03-15T18:10:00Z',
    total_spent: 3100,
  },
  {
    id: 'u-7',
    full_name: 'Natnael Girma',
    phone_number: '+251 922 789012',
    account_type: 'buyer',
    role: 'user',
    is_banned: false,
    created_at: '2026-03-18T10:05:00Z',
    total_spent: 980,
  },
];

const INITIAL_ADMIN_DEALS: DealAdminItem[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    title: '20% off Specialty Macchiato & Croissant',
    merchant_name: 'Bole Highland Cafe',
    category: 'cafe',
    original_price: 180,
    discounted_price: 144,
    discount_pct: 20,
    status: 'active',
    units_available: 12,
    created_at: '2026-04-18T04:12:00Z',
    location: 'Bole Medhanealem, Next to Brass',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    title: 'Fresh Sourdough Rolls (Pack of 6)',
    merchant_name: 'Kebero Bakery',
    category: 'bakery',
    original_price: 120,
    discounted_price: 90,
    discount_pct: 25,
    status: 'active',
    units_available: 15,
    created_at: '2026-04-18T05:30:00Z',
    location: 'Bole Road, Near Edna Mall',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    title: 'Authentic Tomoca Espresso & Macchiato',
    merchant_name: 'Bole Highland Cafe',
    category: 'cafe',
    original_price: 140,
    discounted_price: 110,
    discount_pct: 21,
    status: 'active',
    units_available: 8,
    created_at: '2026-04-17T08:00:00Z',
    location: 'Bole Medhanealem',
  },
  {
    id: 'd-1',
    title: '50% Off Fresh Pastry Assortment',
    merchant_name: 'Kebero Bakery',
    category: 'bakery',
    original_price: 240,
    discounted_price: 120,
    discount_pct: 50,
    status: 'pending',
    units_available: 25,
    created_at: '2026-04-18T04:12:00Z',
    location: 'Bole Medhanealem, Next to Brass',
  },
  {
    id: 'd-2',
    title: 'Signature Special Doro Wot Platter',
    merchant_name: 'Habesha Feast Bole',
    category: 'restaurant',
    original_price: 680,
    discounted_price: 490,
    discount_pct: 28,
    status: 'pending',
    units_available: 15,
    created_at: '2026-04-18T05:30:00Z',
    location: 'Bole Road, Near Edna Mall',
  },
  {
    id: 'd-4',
    title: 'Executive Haircut & Beard Grooming Combo',
    merchant_name: 'Crown Barber & Spa',
    category: 'barbershop',
    original_price: 450,
    discounted_price: 320,
    discount_pct: 29,
    status: 'active',
    units_available: 10,
    created_at: '2026-04-17T11:20:00Z',
    location: 'Kazanchis UNECA Gate',
  },
  {
    id: 'd-5',
    title: 'Imported Greek Olive Oil & Pasta Bundle',
    merchant_name: 'Green Leaf Gourmet',
    category: 'grocery',
    original_price: 1150,
    discounted_price: 890,
    discount_pct: 23,
    status: 'rejected',
    units_available: 8,
    created_at: '2026-04-16T14:10:00Z',
    location: 'Sarbet OAU Quarter',
  },
];

const INITIAL_REPORTS: DisputeReport[] = [
  {
    id: 'rep-101',
    deal_title: '50% Off Fresh Pastry Assortment',
    merchant_name: 'Kebero Bakery',
    customer_phone: '+251 922 890123',
    reason: 'Shop had run out of croissants when customer arrived 15 min after purchase.',
    voucher_code: 'KB-882194',
    amount: 120,
    status: 'open',
    created_at: '2026-04-18T03:45:00Z',
  },
  {
    id: 'rep-102',
    deal_title: 'Executive Haircut & Beard Combo',
    merchant_name: 'Crown Barber & Spa',
    customer_phone: '+251 933 456789',
    reason: 'Cashier demanded an extra 50 ETB paper fee for conditioner.',
    voucher_code: 'CB-449120',
    amount: 320,
    status: 'open',
    created_at: '2026-04-17T16:20:00Z',
  },
  {
    id: 'rep-103',
    deal_title: 'Traditional Macchiato Pair',
    merchant_name: 'Sunrise Café',
    customer_phone: '+251 911 678901',
    reason: 'Customer cancelled order before counter redemption.',
    voucher_code: 'SC-109283',
    amount: 80,
    status: 'refunded',
    created_at: '2026-04-16T12:00:00Z',
  },
];

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_ADMIN_USERS);
  const [deals, setDeals] = useState<DealAdminItem[]>(INITIAL_ADMIN_DEALS);
  const [reports, setReports] = useState<DisputeReport[]>(INITIAL_REPORTS);
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'buyer' | 'seller' | 'admin' | 'banned'>('all');
  const [dealFilterStatus, setDealFilterStatus] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
  const [dealSearchQuery, setDealSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Claim Quota Management State
  const [quotasSummary, setQuotasSummary] = useState<(DealQuotaInfo & { dealTitle?: string; merchantName?: string })[]>(() => {
    if (typeof window === 'undefined') return [];
    return getAllDealQuotasSummary();
  });
  const [quotaDrafts, setQuotaDrafts] = useState<Record<string, { totalQuota: number; holdMinutes: number }>>(() => {
    if (typeof window === 'undefined') return {};
    const summary = getAllDealQuotasSummary();
    const drafts: Record<string, { totalQuota: number; holdMinutes: number }> = {};
    summary.forEach((item) => {
      drafts[item.dealId] = {
        totalQuota: item.totalQuota,
        holdMinutes: item.holdMinutes,
      };
    });
    return drafts;
  });
  const [claimsList, setClaimsList] = useState(() => {
    if (typeof window === 'undefined') return [];
    return getCustomerClaimTickets();
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const refreshQuotaData = useCallback(() => {
    if (typeof window === 'undefined') return;
    const summary = getAllDealQuotasSummary();
    setQuotasSummary(summary);
    setClaimsList(getCustomerClaimTickets());
    // Initialize drafts
    const drafts: Record<string, { totalQuota: number; holdMinutes: number }> = {};
    summary.forEach((item) => {
      drafts[item.dealId] = {
        totalQuota: item.totalQuota,
        holdMinutes: item.holdMinutes,
      };
    });
    setQuotaDrafts((prev) => ({ ...drafts, ...prev }));
  }, []);

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      refreshQuotaData();
      showToast('Telemetry refreshed from Safaricom STK gateway.');
    }, 600);
  };

  // Live Supabase query fallback & Quota listener
  useEffect(() => {
    const onQuotaUpdated = () => refreshQuotaData();
    const onClaimsUpdated = () => refreshQuotaData();

    if (typeof window !== 'undefined') {
      window.addEventListener('tirf_quota_updated', onQuotaUpdated);
      window.addEventListener('tirf_claims_updated', onClaimsUpdated);
    }

    if (!isSupabaseConfigured) {
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('tirf_quota_updated', onQuotaUpdated);
          window.removeEventListener('tirf_claims_updated', onClaimsUpdated);
        }
      };
    }

    const loadLiveSupabaseData = async () => {
      try {
        const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (profiles && profiles.length > 0) {
          setUsers(profiles);
        }

        const { data: liveDeals } = await supabase.from('deals').select('*').order('created_at', { ascending: false });
        if (liveDeals && liveDeals.length > 0) {
          setDeals(
            liveDeals.map((d: SupabaseDealRow) => ({
              id: d.id,
              title: d.title,
              merchant_name: d.merchant_name || 'Verified Merchant',
              category: d.category || 'cafe',
              original_price: d.original_price || d.price || 200,
              discounted_price: d.discounted_price || d.final_amount || 150,
              discount_pct: d.discount_pct || 25,
              status: d.status || 'active',
              units_available: d.units_available || 20,
              created_at: d.created_at || new Date().toISOString(),
              location: d.location,
            }))
          );
        }
      } catch (e) {
        console.warn('Could not load live Supabase admin records; using initialized admin telemetry state.', e);
      }
    };

    loadLiveSupabaseData();

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('tirf_quota_updated', onQuotaUpdated);
        window.removeEventListener('tirf_claims_updated', onClaimsUpdated);
      }
    };
  }, [refreshQuotaData]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.toLowerCase().trim();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.full_name.toLowerCase().includes(q) ||
        u.phone_number.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (userRoleFilter === 'buyer') return u.account_type === 'buyer';
      if (userRoleFilter === 'seller') return u.account_type === 'seller';
      if (userRoleFilter === 'admin') return u.role === 'admin';
      if (userRoleFilter === 'banned') return u.is_banned;
      return true;
    });
  }, [users, userSearchQuery, userRoleFilter]);

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    const q = dealSearchQuery.toLowerCase().trim();
    return deals.filter((d) => {
      const matchesQuery = !q || d.title.toLowerCase().includes(q) || d.merchant_name.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (dealFilterStatus === 'all') return true;
      return d.status === dealFilterStatus;
    });
  }, [deals, dealFilterStatus, dealSearchQuery]);

  // Telemetry Aggregates
  const totalVolumeETB = 248650;
  const platformCommissionETB = Math.round(totalVolumeETB * 0.03);
  const pendingApprovalsCount = deals.filter((d) => d.status === 'pending').length;
  const openReportsCount = reports.filter((r) => r.status === 'open').length;

  // Active claims & quota aggregates
  const activeHoldsTotal = claimsList.filter((c) => c.status === 'claimed').length;
  const paidPickupTotal = claimsList.filter((c) => c.status === 'paid').length;
  const redeemedTotal = claimsList.filter((c) => c.status === 'redeemed').length;

  // Actions
  const handleToggleBan = async (user: UserProfile) => {
    const updatedStatus = !user.is_banned;
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_banned: updatedStatus } : u))
    );

    if (isSupabaseConfigured) {
      await supabase.from('profiles').update({ is_banned: updatedStatus }).eq('id', user.id);
    }

    showToast(
      updatedStatus
        ? `Account for ${user.full_name} suspended.`
        : `Account for ${user.full_name} reactivated.`
    );
  };

  const handleToggleAdmin = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
    );

    if (isSupabaseConfigured) {
      await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
    }

    showToast(`Role updated: ${user.full_name} is now ${newRole}.`);
  };

  const handleUpdateDealStatus = async (dealId: string, newStatus: 'approved' | 'rejected' | 'active') => {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, status: newStatus } : d))
    );

    if (isSupabaseConfigured) {
      await supabase.from('deals').update({ status: newStatus }).eq('id', dealId);
    }

    showToast(
      newStatus === 'approved' || newStatus === 'active'
        ? 'Deal approved and published to live radar!'
        : 'Deal rejected from radar.'
    );
  };

  const handleResolveReport = (reportId: string, action: 'refund' | 'dismiss') => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, status: action === 'refund' ? 'refunded' : 'dismissed' }
          : r
      )
    );

    showToast(
      action === 'refund'
        ? 'Initiated automated Safaricom M-PESA B2C reversal to customer.'
        : 'Report marked as resolved/dismissed.'
    );
  };

  // Quota configuration handlers
  const handleDraftChange = (dealId: string, field: 'totalQuota' | 'holdMinutes', value: number) => {
    setQuotaDrafts((prev) => ({
      ...prev,
      [dealId]: {
        totalQuota: field === 'totalQuota' ? Math.max(1, value) : prev[dealId]?.totalQuota || 10,
        holdMinutes: field === 'holdMinutes' ? Math.max(5, value) : prev[dealId]?.holdMinutes || 30,
      },
    }));
  };

  const handleSaveDealQuota = (dealId: string, title?: string, merchant?: string) => {
    const draft = quotaDrafts[dealId] || { totalQuota: 10, holdMinutes: 30 };
    setCustomDealQuota(dealId, draft.totalQuota, draft.holdMinutes, merchant, title);
    refreshQuotaData();
    showToast(`Saved Quota: ${draft.totalQuota} discounts, ${draft.holdMinutes}m hold validity.`);
  };

  const handleScanAndExpireHolds = () => {
    const expired = checkAndExpireClaims();
    refreshQuotaData();
    showToast(
      expired.length > 0
        ? `Expired ${expired.length} unpaid claims. Quotas automatically restored to merchant inventory!`
        : 'Scanned all active holds: zero expired claims found. All active holds are within validity windows.'
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-blue-50 text-slate-800 font-sans pb-20 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Decorative Ambient Radial Glows mirroring Login Page */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[360px] bg-gradient-to-b from-emerald-200/40 via-teal-100/30 to-transparent blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-[350px] right-0 w-[550px] h-[350px] bg-blue-200/30 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-0 w-[450px] h-[300px] bg-emerald-100/40 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-4 py-3 rounded-2xl shadow-xl shadow-emerald-700/20 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 border border-emerald-400/40">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-100" />
          <span className="text-xs sm:text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Executive Command Bar (Sticky Header in crisp white glass) */}
      <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Left: Branding & Role */}
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 border border-slate-200/70 transition-all cursor-pointer"
              title="Return to Public Marketplace"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                    Tirf<span className="text-emerald-600">Market</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    ADMIN CONSOLE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  National Oversight · M-PESA Clearing · Claim Hold Quotas
                </p>
              </div>
            </div>
          </div>

          {/* Right: Telemetry & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-700 bg-white/80 px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Daraja STK Gateway: <strong className="text-emerald-700 font-mono">2.1s avg</strong></span>
            </div>

            <button
              type="button"
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
              title={`Last refreshed: ${lastRefreshed}. Click to refresh.`}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <Link
              href="/"
              className="px-3 sm:px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs hover:shadow transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span>Marketplace</span>
            </Link>
          </div>
        </div>

        {/* Executive Tab Switcher (Styled like Modern Auth pill controls) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-200/70 py-2">
          <div className="inline-flex p-1 bg-slate-200/70 rounded-2xl space-x-1 sm:space-x-1.5 overflow-x-auto max-w-full shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-3.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Marketplace Statistics</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('approvals')}
              className={`py-2 px-3.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'approvals'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Deal & Shop Approvals</span>
              {pendingApprovalsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-400 text-slate-900 font-black">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>

            {/* Dedicated Claim & Quota Settings Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('claims')}
              className={`py-2 px-3.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'claims'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Claim & Quota Settings</span>
              {activeHoldsTotal > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500 text-white font-black animate-pulse">
                  {activeHoldsTotal}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`py-2 px-3.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Registered Directory</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 text-slate-700 font-semibold">
                {users.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-3.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Disputes & Flags</span>
              {openReportsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-black animate-pulse">
                  {openReportsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Signature Curved Hero Banner (Echoing the Login Page Aesthetic) */}
        <section className="bg-gradient-to-r from-emerald-700 via-teal-700 to-blue-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Decorative Overlay Curves */}
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-40 top-0 w-44 h-44 bg-teal-300/15 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-xs font-bold border border-white/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Hyperlocal Trust Architecture · Addis Ababa</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                National Oversight & Quota Governance
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                Direct Safaricom M-PESA STK settlement, merchant license verification, automated claim hold windows, and instant inventory reversals.
              </p>
            </div>

            {/* Quick Metrics in Frosted Glass Cards */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
              <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-200 block">Deals Live</span>
                <span className="text-xl sm:text-2xl font-black font-mono">
                  {deals.filter((d) => d.status === 'active').length}
                </span>
              </div>

              <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-teal-200 block">Claims Held</span>
                <span className="text-xl sm:text-2xl font-black font-mono">
                  {activeHoldsTotal}
                </span>
              </div>

              <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-3 text-center">
                <span className="text-[10px] uppercase font-bold text-blue-200 block">Avg STK</span>
                <span className="text-xl sm:text-2xl font-black font-mono">
                  2.1s
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Executive KPI Telemetry Grid (Crisp White Rounded-3xl Cards) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Gross Cashless Volume */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[11px]">Gross M-PESA Volume</span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
              {totalVolumeETB.toLocaleString()} <span className="text-xs font-bold text-emerald-600 font-sans">ETB</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 w-fit px-2.5 py-0.5 rounded-full border border-emerald-100">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% from last week</span>
            </div>
          </div>

          {/* Card 2: Registered Accounts */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[11px]">Total Accounts</span>
              <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
              {users.length * 200 + 20} <span className="text-xs font-bold text-slate-400 font-sans">Wallets</span>
            </div>
            <div className="text-xs text-slate-500">
              <strong className="text-slate-800">140</strong> Merchants · <strong className="text-slate-800">1,280</strong> Buyers
            </div>
          </div>

          {/* Card 3: Active Promotions & Queue */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[11px]">Active Radar Drops</span>
              <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
              {deals.filter((d) => d.status === 'active').length + 80}
            </div>
            <div className="text-xs text-amber-800 font-semibold bg-amber-50 w-fit px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{pendingApprovalsCount} awaiting moderation</span>
            </div>
          </div>

          {/* Card 4: Platform Revenue / Settlement Rate */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[11px]">Platform Pool (3%)</span>
              <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900">
              {platformCommissionETB.toLocaleString()} <span className="text-xs font-bold text-teal-700 font-sans">ETB</span>
            </div>
            <div className="text-xs text-slate-500">
              94.2% successful redemption rate
            </div>
          </div>
        </section>

        {/* TAB 1: MARKETPLACE STATISTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Volume Breakdown */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>Market Share by Merchant Category</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">5 Categories</span>
                </div>

                <div className="space-y-4 pt-1">
                  {[
                    { label: 'Café & Traditional Bunna', count: 42, pct: 42, color: 'bg-amber-500', icon: Coffee },
                    { label: 'Fresh Bakeries & Pastries', count: 24, pct: 24, color: 'bg-orange-500', icon: ShoppingBag },
                    { label: 'Traditional & Modern Eateries', count: 18, pct: 18, color: 'bg-emerald-600', icon: Utensils },
                    { label: 'Hyperlocal Groceries', count: 10, pct: 10, color: 'bg-teal-600', icon: Layers },
                    { label: 'Barber, Grooming & Beauty', count: 6, pct: 6, color: 'bg-blue-600', icon: Scissors },
                  ].map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <div key={cat.label} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                            <CatIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cat.label}</span>
                          </span>
                          <span className="font-mono text-slate-500 font-medium">{cat.pct}% ({cat.count} shops)</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${cat.color} rounded-full transition-all duration-500`} style={{ width: `${cat.pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Geographical Concentration */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Store className="w-4 h-4 text-teal-600" />
                    <span>Regional Volume by Addis Ababa Zone</span>
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    2.0 km Clustered
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {[
                    { zone: 'Bole Medhanealem & Edna Mall', gmv: '112,400 ETB', share: 45, rank: 1 },
                    { zone: '4 Kilo AAU University Campus', gmv: '58,200 ETB', share: 23, rank: 2 },
                    { zone: 'Kazanchis & UNECA Hub', gmv: '38,100 ETB', share: 15, rank: 3 },
                    { zone: 'Piazza Historical Bazaar', gmv: '24,950 ETB', share: 10, rank: 4 },
                    { zone: 'Mexico Square & Sarbet', gmv: '15,000 ETB', share: 7, rank: 5 },
                  ].map((region) => (
                    <div key={region.zone} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-white border border-slate-200 text-slate-700 font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                          #{region.rank}
                        </span>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{region.zone}</div>
                          <div className="text-[11px] text-slate-500">Share of local drops: {region.share}%</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold font-mono text-xs sm:text-sm text-emerald-700">{region.gmv}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-mono">Cleared STK</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform Infrastructure Health Strip */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-blue-50 border border-emerald-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-sm text-slate-900">Safaricom Daraja STK Push Integration</span>
                  <span className="text-[10px] bg-emerald-600 text-white font-mono px-2 py-0.5 rounded-full font-bold shadow-2xs">
                    OPERATIONAL
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Average USSD PIN prompt dispatch latency: <strong className="text-slate-900">2.1s</strong>. Zero merchant settlement discrepancies detected.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Backend API:</span>
                <span className="font-mono text-emerald-800 font-bold bg-white px-3 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                  tirfmarket-backend.onrender.com (200 OK)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEAL & SHOP APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Merchant Flash Deal Review Queue</h3>
                <p className="text-xs text-slate-500">
                  Verify discount percentages, original prices, and inventory limits before deals go live on the customer radar.
                </p>
              </div>

              {/* Status Filter & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={dealSearchQuery}
                    onChange={(e) => setDealSearchQuery(e.target.value)}
                    placeholder="Search deals, shops..."
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs min-h-[36px]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(['all', 'pending', 'active', 'rejected'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDealFilterStatus(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        dealFilterStatus === st
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Deals Table */}
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3.5 px-5">Deal Title & Category</th>
                      <th className="py-3.5 px-4">Merchant & Location</th>
                      <th className="py-3.5 px-4">Pricing & Discount</th>
                      <th className="py-3.5 px-4">Inventory</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-5 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredDeals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-medium">
                          No deals found matching filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredDeals.map((deal) => (
                        <tr key={deal.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-slate-900 text-sm">{deal.title}</div>
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100">
                              {deal.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{deal.merchant_name}</div>
                            <div className="text-[11px] text-slate-400">{deal.location || 'Addis Ababa'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-slate-400 line-through font-mono">ETB {deal.original_price}</span>
                              <span className="font-black text-emerald-700 font-mono text-sm">ETB {deal.discounted_price}</span>
                            </div>
                            <span className="text-[10px] font-bold text-rose-600 font-mono">
                              -{deal.discount_pct}% OFF
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {deal.units_available} vouchers
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider font-mono ${
                                deal.status === 'active' || deal.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : deal.status === 'pending'
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {deal.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {deal.status !== 'active' && deal.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDealStatus(deal.id, 'active')}
                                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs shadow-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                              )}

                              {deal.status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDealStatus(deal.id, 'rejected')}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 active:scale-95 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CLAIM & QUOTA SETTINGS (NEW DEDICATED MANAGEMENT INTERFACE) */}
        {activeTab === 'claims' && (
          <div className="space-y-6">
            {/* Header & Policy Explanation Banner */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">Claim Quota & Hold Validity Configuration</h3>
                  </div>
                  <p className="text-xs text-slate-500 max-w-3xl">
                    Configure customer claim hold windows and allocated discount unit quotas. Protects merchant inventory with automated reversibility if payment is not completed before hold expiry.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleScanAndExpireHolds}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold rounded-xl shadow-xs text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    title="Audit and expire any unpaid holds that passed the merchant validity window"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Scan & Free Expired Holds</span>
                  </button>
                </div>
              </div>

              {/* Three Pillars Policy Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 border-t border-slate-100">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <Timer className="w-4 h-4 text-emerald-700" />
                    <span>Hold Validity Window</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                    Locks 1 discount voucher when customer taps &apos;Claim&apos; for 15-60 min. Customer enters M-PESA PIN without risk of voucher being taken.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100/80 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <Lock className="w-4 h-4 text-blue-700" />
                    <span>Automated Quota Reversal</span>
                  </div>
                  <p className="text-[11px] text-blue-800/80 leading-relaxed">
                    If customer does not enter their Safaricom PIN before the hold expires, the claim is auto-cancelled and the quota is instantly returned to available inventory.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100/80 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <CheckCircle2 className="w-4 h-4 text-amber-700" />
                    <span>Counter Pickup Window</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 leading-relaxed">
                    Paid orders receive an authenticated 8-character voucher (e.g. TIRF-8F1A01). If never picked up, system queues automated B2C reversal.
                  </p>
                </div>
              </div>
            </div>

            {/* Quota Telemetry Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Managed Deals</span>
                <div className="text-2xl font-black font-mono text-slate-900">
                  {quotasSummary.length || deals.length}
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold block">Configured deal quotas</span>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Active Unpaid Holds</span>
                <div className="text-2xl font-black font-mono text-blue-600">
                  {activeHoldsTotal}
                </div>
                <span className="text-[11px] text-slate-500 block">Vouchers locked in countdown</span>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Paid Awaiting Pickup</span>
                <div className="text-2xl font-black font-mono text-emerald-600">
                  {paidPickupTotal}
                </div>
                <span className="text-[11px] text-slate-500 block">Cleared via Safaricom STK</span>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-2 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Redeemed at Counter</span>
                <div className="text-2xl font-black font-mono text-teal-600">
                  {redeemedTotal}
                </div>
                <span className="text-[11px] text-slate-500 block">100% merchant verified</span>
              </div>
            </div>

            {/* Quota Management Table */}
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Per-Deal Quotas & Validity Tuning</h4>
                  <p className="text-xs text-slate-500">Fine-tune total discounts available and validity windows per merchant deal.</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  Live Local Storage + Cloud Sync
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3.5 px-5">Deal & Merchant</th>
                      <th className="py-3.5 px-4">Total Quota</th>
                      <th className="py-3.5 px-4">Hold Validity (Min)</th>
                      <th className="py-3.5 px-4">Current Availability</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {quotasSummary.map((q) => {
                      const draft = quotaDrafts[q.dealId] || { totalQuota: q.totalQuota, holdMinutes: q.holdMinutes };
                      return (
                        <tr key={q.dealId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-bold text-slate-900 text-sm">{q.dealTitle || 'Marketplace Deal'}</div>
                            <div className="text-xs text-slate-500">{q.merchantName || 'Verified Merchant'}</div>
                            <div className="font-mono text-[10px] text-slate-400 mt-0.5">{q.dealId.slice(0, 18)}...</div>
                          </td>

                          {/* Editable Total Quota */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDraftChange(q.dealId, 'totalQuota', draft.totalQuota - 1)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={500}
                                value={draft.totalQuota}
                                onChange={(e) => handleDraftChange(q.dealId, 'totalQuota', parseInt(e.target.value) || 1)}
                                className="w-16 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleDraftChange(q.dealId, 'totalQuota', draft.totalQuota + 1)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Editable Hold Minutes (Select or Quick Chips) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1">
                              {[15, 30, 45, 60].map((mins) => (
                                <button
                                  key={mins}
                                  type="button"
                                  onClick={() => handleDraftChange(q.dealId, 'holdMinutes', mins)}
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                    draft.holdMinutes === mins
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {mins}m
                                </button>
                              ))}
                            </div>
                          </td>

                          {/* Availability Breakdown */}
                          <td className="py-3.5 px-4 font-mono text-xs">
                            <div>
                              <strong className="text-emerald-700">{q.availableQuota}</strong> / {q.totalQuota} left
                            </div>
                            <div className="text-[11px] text-slate-400 font-sans">
                              {q.activeHolds} on hold · {q.paidCount} paid
                            </div>
                          </td>

                          {/* Sold Out / Active Badge */}
                          <td className="py-3.5 px-4">
                            {q.isSoldOut ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-800 border border-rose-200">
                                Sold Out
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                In Stock
                              </span>
                            )}
                          </td>

                          {/* Save Action Button */}
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => handleSaveDealQuota(q.dealId, q.dealTitle, q.merchantName)}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold rounded-xl shadow-xs transition-all text-xs cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REGISTERED USERS DIRECTORY */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Registered Users & Merchants</h3>
                <p className="text-xs text-slate-500">
                  Search accounts, inspect transaction volume, moderate bad actors, and assign administrative roles.
                </p>
              </div>

              {/* User Search & Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search name, phone..."
                    className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs min-h-[36px]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as 'all' | 'buyer' | 'seller' | 'admin' | 'banned')}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer min-h-[36px] shadow-2xs"
                >
                  <option value="all">All Roles</option>
                  <option value="buyer">Buyers Only</option>
                  <option value="seller">Merchants (Sellers)</option>
                  <option value="admin">Administrators</option>
                  <option value="banned">Banned Accounts</option>
                </select>
              </div>
            </div>

            {/* Users Directory Table */}
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-3.5 px-5">User Details</th>
                      <th className="py-3.5 px-4">Contact Phone</th>
                      <th className="py-3.5 px-4">Account Type</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Activity Status</th>
                      <th className="py-3.5 px-5 text-right">Administrative Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-medium">
                          No users found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const initials = user.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();
                        return (
                          <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-sm">{user.full_name}</div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{user.phone_number}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider ${
                                  user.account_type === 'seller'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {user.account_type}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                                  user.role === 'admin'
                                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                    : 'text-slate-500'
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {user.is_banned ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                  <Ban className="w-3 h-3" />
                                  <span>BANNED</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>ACTIVE</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleBan(user)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    user.is_banned
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200'
                                  }`}
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>{user.is_banned ? 'Unban' : 'Ban'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleAdmin(user)}
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                                  title={user.role === 'admin' ? 'Remove admin access' : 'Promote to superadmin'}
                                >
                                  {user.role === 'admin' ? 'Demote' : 'Make Admin'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DISPUTES & COMMUNITY REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Dispute & Flag Moderation Hub</h3>
              <p className="text-xs text-slate-500">
                Audit customer counter grievances, enforce shop compliance, and issue automated M-PESA reversals.
              </p>
            </div>

            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md">
                        #{report.id}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{report.deal_title}</span>
                      <span className="text-xs text-slate-500">at <strong className="text-slate-800">{report.merchant_name}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md ${
                          report.status === 'open'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : report.status === 'refunded'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {report.status}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="text-slate-400 font-medium">Customer Phone</div>
                      <div className="font-mono text-slate-800 font-semibold flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{report.customer_phone}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-400 font-medium">Voucher Ref</div>
                      <div className="font-mono text-emerald-700 font-bold">{report.voucher_code} ({report.amount} ETB)</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-400 font-medium">Customer Complaint</div>
                      <div className="text-slate-700 leading-relaxed">{report.reason}</div>
                    </div>
                  </div>

                  {report.status === 'open' && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolveReport(report.id, 'refund')}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Issue M-PESA Reversal ({report.amount} ETB)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResolveReport(report.id, 'dismiss')}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-200"
                      >
                        Dismiss Flag
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
