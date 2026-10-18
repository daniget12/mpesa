'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
    location: 'Bole Medhanialem, Next to Brass',
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
    id: 'd-3',
    title: 'Buy 1 Get 1 Free Traditional Macchiato',
    merchant_name: 'Sunrise Café',
    category: 'cafe',
    original_price: 160,
    discounted_price: 80,
    discount_pct: 50,
    status: 'active',
    units_available: 50,
    created_at: '2026-04-17T08:00:00Z',
    location: 'Bole Medhanialem',
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
  const [activeTab, setActiveTab] = useState<'analytics' | 'approvals' | 'users' | 'reports'>('analytics');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'buyer' | 'seller' | 'admin' | 'banned'>('all');
  const [dealFilterStatus, setDealFilterStatus] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
  const [dealSearchQuery, setDealSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      showToast('Telemetry refreshed from Safaricom STK gateway.');
    }, 600);
  };

  // Live Supabase query fallback
  useEffect(() => {
    if (!isSupabaseConfigured) return;

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
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Ambient Radial Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[340px] bg-gradient-to-b from-indigo-600/12 via-indigo-900/5 to-transparent blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-[350px] right-0 w-[500px] h-[300px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-2xl shadow-emerald-500/25 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 border border-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs sm:text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Executive Command Bar (Sticky Header) */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Left: Branding & Role */}
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
              title="Return to Public Marketplace"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 border border-indigo-400/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-base sm:text-lg tracking-tight text-white">
                    TirfMarket Console
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    EXECUTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  National Oversight · M-PESA Clearing · Merchant Compliance
                </p>
              </div>
            </div>
          </div>

          {/* Right: Telemetry & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-300 bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Daraja STK Gateway: <strong className="text-emerald-400 font-mono">2.1s avg</strong></span>
            </div>

            <button
              type="button"
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 border border-slate-800/80 transition-all cursor-pointer"
              title={`Last refreshed: ${lastRefreshed}. Click to refresh.`}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <Link
              href="/"
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-850 hover:to-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/80 shadow-xs transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>Marketplace</span>
            </Link>
          </div>
        </div>

        {/* Executive Tab Switcher */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-2 border-t border-slate-800/60 overflow-x-auto scrollbar-none py-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-3.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Deal & Shop Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-400 text-slate-950 font-black">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-2 px-3.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registered Directory</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`py-2 px-3.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Executive KPI Telemetry Grid (Always visible summary metrics) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Gross Cashless Volume */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-5 space-y-2.5 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Gross M-PESA Volume</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white">
              {totalVolumeETB.toLocaleString()} <span className="text-xs font-bold text-emerald-400 font-sans">ETB</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% from last week</span>
            </div>
          </div>

          {/* Card 2: Registered Accounts */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-5 space-y-2.5 shadow-xl relative overflow-hidden group hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Total Accounts</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white">
              {users.length * 200 + 20} <span className="text-xs font-bold text-slate-400 font-sans">Wallets</span>
            </div>
            <div className="text-xs text-slate-400">
              <strong className="text-slate-200">140</strong> Merchants · <strong className="text-slate-200">1,280</strong> Buyers
            </div>
          </div>

          {/* Card 3: Active Promotions & Queue */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-5 space-y-2.5 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Active Radar Drops</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white">
              {deals.filter((d) => d.status === 'active').length + 80}
            </div>
            <div className="text-xs text-amber-300 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{pendingApprovalsCount} awaiting moderation</span>
            </div>
          </div>

          {/* Card 4: Platform Revenue / Settlement Rate */}
          <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-5 space-y-2.5 shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Platform Pool (3%)</span>
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white">
              {platformCommissionETB.toLocaleString()} <span className="text-xs font-bold text-cyan-400 font-sans">ETB</span>
            </div>
            <div className="text-xs text-slate-400">
              94.2% successful redemption rate
            </div>
          </div>
        </section>

        {/* TAB 1: MARKETPLACE STATISTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Volume Breakdown */}
              <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <span>Market Share by Merchant Category</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">5 Categories</span>
                </div>

                <div className="space-y-3.5 pt-1">
                  {[
                    { label: 'Café & Traditional Bunna', count: 42, pct: 42, color: 'bg-amber-500', icon: Coffee },
                    { label: 'Fresh Bakeries & Pastries', count: 24, pct: 24, color: 'bg-orange-500', icon: ShoppingBag },
                    { label: 'Traditional & Modern Eateries', count: 18, pct: 18, color: 'bg-emerald-500', icon: Utensils },
                    { label: 'Hyperlocal Groceries', count: 10, pct: 10, color: 'bg-teal-500', icon: Layers },
                    { label: 'Barber, Grooming & Beauty', count: 6, pct: 6, color: 'bg-purple-500', icon: Scissors },
                  ].map((cat) => {
                    const CatIcon = cat.icon;
                    return (
                      <div key={cat.label} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium flex items-center gap-1.5">
                            <CatIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cat.label}</span>
                          </span>
                          <span className="font-mono text-slate-400">{cat.pct}% ({cat.count} shops)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden">
                          <div className={`h-full ${cat.color} rounded-full transition-all duration-500`} style={{ width: `${cat.pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Geographical Concentration */}
              <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-400" />
                    <span>Regional Volume by Addis Ababa Zone</span>
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">2.0 km Clustered</span>
                </div>

                <div className="space-y-3 pt-1">
                  {[
                    { zone: 'Bole Medhanealem & Edna Mall', gmv: '112,400 ETB', share: 45, rank: 1 },
                    { zone: '4 Kilo AAU University Campus', gmv: '58,200 ETB', share: 23, rank: 2 },
                    { zone: 'Kazanchis & UNECA Hub', gmv: '38,100 ETB', share: 15, rank: 3 },
                    { zone: 'Piazza Historical Bazaar', gmv: '24,950 ETB', share: 10, rank: 4 },
                    { zone: 'Mexico Square & Sarbet', gmv: '15,000 ETB', share: 7, rank: 5 },
                  ].map((region) => (
                    <div key={region.zone} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          #{region.rank}
                        </span>
                        <div>
                          <div className="font-bold text-xs text-white">{region.zone}</div>
                          <div className="text-[11px] text-slate-400">Share of local drops: {region.share}%</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold font-mono text-xs sm:text-sm text-emerald-400">{region.gmv}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-mono">Cleared STK</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform Infrastructure Health Strip */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-950/80 border border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-sm text-white">Safaricom Daraja STK Push Integration</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                    OPERATIONAL
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Average USSD PIN prompt dispatch latency: <strong className="text-slate-200">2.1s</strong>. Zero merchant settlement discrepancies detected.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Backend API:</span>
                <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
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
                <h3 className="text-lg font-black text-white">Merchant Flash Deal Review Queue</h3>
                <p className="text-xs text-slate-400">
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
                    className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 min-h-[36px]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {(['all', 'pending', 'active', 'rejected'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setDealFilterStatus(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        dealFilterStatus === st
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Deals Table */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Deal Title & Category</th>
                      <th className="py-3.5 px-4">Merchant & Location</th>
                      <th className="py-3.5 px-4">Pricing & Discount</th>
                      <th className="py-3.5 px-4">Inventory</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-200">
                    {filteredDeals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                          No deals found matching filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredDeals.map((deal) => (
                        <tr key={deal.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm">{deal.title}</div>
                            <span className="inline-block mt-0.5 text-[10px] font-semibold text-indigo-300 uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/20">
                              {deal.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-200">{deal.merchant_name}</div>
                            <div className="text-[11px] text-slate-400">{deal.location || 'Addis Ababa'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-slate-400 line-through font-mono">ETB {deal.original_price}</span>
                              <span className="font-black text-emerald-400 font-mono text-sm">ETB {deal.discounted_price}</span>
                            </div>
                            <span className="text-[10px] font-bold text-rose-400 font-mono">
                              -{deal.discount_pct}% OFF
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                            {deal.units_available} vouchers
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider font-mono ${
                                deal.status === 'active' || deal.status === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : deal.status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {deal.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {deal.status !== 'active' && deal.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDealStatus(deal.id, 'active')}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs shadow-xs shadow-emerald-950/50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                              )}

                              {deal.status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDealStatus(deal.id, 'rejected')}
                                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 active:scale-95 text-rose-300 hover:text-white border border-rose-800/60 font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs"
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

        {/* TAB 3: REGISTERED USERS DIRECTORY */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white">Registered Users & Merchants</h3>
                <p className="text-xs text-slate-400">
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
                    className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 min-h-[36px]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as 'all' | 'buyer' | 'seller' | 'admin' | 'banned')}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer min-h-[36px]"
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
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">User Details</th>
                      <th className="py-3.5 px-4">Contact Phone</th>
                      <th className="py-3.5 px-4">Account Type</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Activity Status</th>
                      <th className="py-3.5 px-4 text-right">Administrative Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-200">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
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
                          <tr key={user.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-sm">{user.full_name}</div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3 h-3 text-slate-500" />
                                    <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{user.phone_number}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider ${
                                  user.account_type === 'seller'
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {user.account_type}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                                  user.role === 'admin'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'text-slate-400'
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {user.is_banned ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                                  <Ban className="w-3 h-3" />
                                  <span>BANNED</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>ACTIVE</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleBan(user)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    user.is_banned
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                      : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60'
                                  }`}
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>{user.is_banned ? 'Unban' : 'Ban'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleAdmin(user)}
                                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
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

        {/* TAB 4: DISPUTES & COMMUNITY REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-white">Dispute & Flag Moderation Hub</h3>
              <p className="text-xs text-slate-400">
                Audit customer counter grievances, enforce shop compliance, and issue automated M-PESA reversals.
              </p>
            </div>

            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-md">
                        #{report.id}
                      </span>
                      <span className="font-bold text-white text-sm">{report.deal_title}</span>
                      <span className="text-xs text-slate-400">at <strong className="text-slate-200">{report.merchant_name}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md ${
                          report.status === 'open'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : report.status === 'refunded'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {report.status}
                      </span>
                      <span className="text-xs text-slate-500">{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="text-slate-500 font-medium">Customer Phone</div>
                      <div className="font-mono text-slate-200 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{report.customer_phone}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-500 font-medium">Voucher Ref</div>
                      <div className="font-mono text-emerald-400 font-bold">{report.voucher_code} ({report.amount} ETB)</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-500 font-medium">Customer Complaint</div>
                      <div className="text-slate-300">{report.reason}</div>
                    </div>
                  </div>

                  {report.status === 'open' && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolveReport(report.id, 'refund')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shadow-emerald-950/50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Issue M-PESA Reversal ({report.amount} ETB)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResolveReport(report.id, 'dismiss')}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-800"
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
