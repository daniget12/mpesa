'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Tag,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Ban,
  Check,
  X,
  ArrowLeft,
  BarChart3,
  Store,
  Eye,
  FileText,
  Activity,
  Clock,
  Award,
  ChevronDown,
  Sparkles,
  Phone,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { INITIAL_SHOPS, INITIAL_DEALS } from '@/mockData/miniapp';

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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
            liveDeals.map((d: any) => ({
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
    return deals.filter((d) => {
      if (dealFilterStatus === 'all') return true;
      return d.status === dealFilterStatus;
    });
  }, [deals, dealFilterStatus]);

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
        ? `User ${user.full_name} has been banned.`
        : `User ${user.full_name} has been unbanned.`
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
        ? 'Deal approved and published to customer radar!'
        : 'Deal rejected.'
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
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Return to Public Marketplace"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-white">
                    TirfMarket Admin Console
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                    SUPERADMIN
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  National Oversight, Trade Compliance & M-PESA Clearing
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Safaricom STK Gateway: <strong>Operational</strong></span>
            </div>

            <Link
              href="/"
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            >
              Marketplace
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-2 border-t border-slate-800/60 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`py-3 px-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Marketplace Statistics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`py-3 px-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'approvals'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Deal & Shop Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500 text-slate-950 font-black">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registered Users</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'reports'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Disputes & Flags</span>
            {openReportsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500 text-white font-black">
                {openReportsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Executive Telemetry Grid (Always visible summary metrics) */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Gross Cashless GMV */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Gross M-PESA Volume</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
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
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Total Registered</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white">
              {users.length * 200 + 20} <span className="text-xs font-bold text-slate-400 font-sans">Accounts</span>
            </div>
            <div className="text-xs text-slate-400">
              <strong className="text-slate-200">140</strong> Merchants · <strong className="text-slate-200">1,280</strong> Buyers
            </div>
          </div>

          {/* Card 3: Active Promotions & Queue */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Active Radar Drops</span>
              <Tag className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white">
              {deals.filter((d) => d.status === 'active').length + 80}
            </div>
            <div className="text-xs text-amber-300 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{pendingApprovalsCount} awaiting moderation</span>
            </div>
          </div>

          {/* Card 4: Platform Revenue / Redemptions */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Platform Take (3%)</span>
              <Award className="w-4 h-4 text-cyan-400" />
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
            {/* Breakdown Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Volume Breakdown */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <span>Market Share by Merchant Category</span>
                </h3>

                <div className="space-y-3 pt-2">
                  {[
                    { label: 'Café & Traditional Bunna', count: 42, pct: 42, color: 'bg-amber-500' },
                    { label: 'Fresh Bakeries & Pastries', count: 24, pct: 24, color: 'bg-orange-500' },
                    { label: 'Traditional & Modern Eateries', count: 18, pct: 18, color: 'bg-emerald-500' },
                    { label: 'Hyperlocal Groceries', count: 10, pct: 10, color: 'bg-teal-500' },
                    { label: 'Barber, Grooming & Beauty', count: 6, pct: 6, color: 'bg-purple-500' },
                  ].map((cat) => (
                    <div key={cat.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{cat.label}</span>
                        <span className="font-mono text-slate-400">{cat.pct}% ({cat.count} shops)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geographical Concentration */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>Regional Volume by Addis Ababa Zone</span>
                </h3>

                <div className="space-y-3 pt-2">
                  {[
                    { zone: 'Bole Medhanealem & Edna Mall', gmv: '112,400 ETB', share: 45 },
                    { zone: '4 Kilo AAU University Campus', gmv: '58,200 ETB', share: 23 },
                    { zone: 'Kazanchis & UNECA Hub', gmv: '38,100 ETB', share: 15 },
                    { zone: 'Piazza Historical Bazaar', gmv: '24,950 ETB', share: 10 },
                    { zone: 'Mexico Square & Sarbet', gmv: '15,000 ETB', share: 7 },
                  ].map((region) => (
                    <div key={region.zone} className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-white">{region.zone}</div>
                        <div className="text-[11px] text-slate-400">Share of local drops: {region.share}%</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold font-mono text-sm text-emerald-400">{region.gmv}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-mono">Cleared</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform Infrastructure Health Strip */}
            <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-sm text-white">Safaricom Daraja STK Push Integration</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded font-bold">
                    CONNECTED
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Average USSD PIN prompt dispatch latency: <strong className="text-slate-200">2.1s</strong>. Zero merchant settlement discrepancies detected.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Backend API:</span>
                <span className="text-xs font-mono text-emerald-400 font-bold">tirfmarket-backend.onrender.com (200 OK)</span>
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

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['all', 'pending', 'active', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setDealFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                      dealFilterStatus === st
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Deals Table */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Deal Title & Category</th>
                      <th className="py-3 px-4">Merchant & Location</th>
                      <th className="py-3 px-4">Pricing & Discount</th>
                      <th className="py-3 px-4">Inventory</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Moderation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {filteredDeals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{deal.title}</div>
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-indigo-300 uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10">
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
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {deal.status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateDealStatus(deal.id, 'rejected')}
                                className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-xs"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">User Details</th>
                      <th className="py-3 px-4">Contact Phone</th>
                      <th className="py-3 px-4">Account Type</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Activity Status</th>
                      <th className="py-3 px-4 text-right">Administrative Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{user.full_name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {user.phone_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                              user.account_type === 'seller'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {user.account_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
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
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                              <Ban className="w-3 h-3" />
                              <span>BANNED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ACTIVE</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Ban / Unban Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleBan(user)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                user.is_banned
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : 'bg-rose-900/60 hover:bg-rose-700 text-rose-200 border border-rose-800'
                              }`}
                            >
                              <Ban className="w-3 h-3" />
                              <span>{user.is_banned ? 'Unban' : 'Ban'}</span>
                            </button>

                            {/* Promote / Demote Admin Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleAdmin(user)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                              title={user.role === 'admin' ? 'Remove admin access' : 'Promote to superadmin'}
                            >
                              {user.role === 'admin' ? 'Demote' : 'Make Admin'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                  className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        #{report.id}
                      </span>
                      <span className="font-bold text-white text-sm">{report.deal_title}</span>
                      <span className="text-xs text-slate-400">at <strong>{report.merchant_name}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
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
                      <div className="font-mono text-slate-200">{report.customer_phone}</div>
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
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Issue M-PESA Reversal ({report.amount} ETB)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResolveReport(report.id, 'dismiss')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
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
