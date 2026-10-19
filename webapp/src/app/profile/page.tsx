'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getCustomerClaimTickets,
  updateClaimTicketReview,
  markClaimTicketRedeemed,
  getRatingForMerchant,
  checkAndExpireClaims,
  cancelClaimTicket,
  CustomerClaimTicket,
} from '@/lib/claimsStorage';
import MpesaModal from '@/components/MpesaModal';
import { QrCodeSvg } from '@/components/common/QrCodeSvg';
import {
  User as UserIcon,
  Ticket,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Star,
  ArrowLeft,
  Store,
  Sparkles,
  ShoppingBag,
  MessageSquarePlus,
  Edit3,
  XCircle,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, profileName, isMerchant, loading: authLoading } = useAuth();
  const merchantRating = getRatingForMerchant(profileName || 'Bole Highland Cafe');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user && isSupabaseConfigured) {
      router.push('/login?redirect=/profile');
    }
  }, [user, authLoading, router]);

  // Tickets State
  const [tickets, setTickets] = useState<CustomerClaimTicket[]>(() => {
    if (typeof window !== 'undefined') {
      return getCustomerClaimTickets();
    }
    return [];
  });
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'ready' | 'reviewed'>('all');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [selectedTicketForPayment, setSelectedTicketForPayment] = useState<CustomerClaimTicket | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Review Editing State
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [commentInput, setCommentInput] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Load claims from storage
  const refreshClaims = useCallback(() => {
    checkAndExpireClaims();
    setTickets(getCustomerClaimTickets());
  }, []);

  useEffect(() => {
    const handleUpdate = () => refreshClaims();
    window.addEventListener('tirf_claims_updated', handleUpdate);
    window.addEventListener('tirf_quota_updated', handleUpdate);

    // Ticking interval every second for live countdowns & auto-expiry
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
      checkAndExpireClaims();
    }, 1000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('tirf_claims_updated', handleUpdate);
      window.removeEventListener('tirf_quota_updated', handleUpdate);
    };
  }, [refreshClaims]);

  // Copy redemption code
  const handleCopy = (code: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2200);
    }
  };

  // Cancel reservation early (releases quota back to shop)
  const handleCancelHold = (ticketId: string) => {
    cancelClaimTicket(ticketId);
    setSuccessToast('Reservation cancelled. 1 unit was returned to the shop quota.');
    setTimeout(() => setSuccessToast(null), 3500);
    refreshClaims();
  };

  // Start editing review
  const handleStartReview = (ticket: CustomerClaimTicket) => {
    setEditingReviewId(ticket.id);
    setRatingInput(ticket.rating || 5);
    setHoverRating(0);
    setCommentInput(ticket.reviewComment || '');
  };

  // Submit review
  const handleSubmitReview = (ticketId: string) => {
    setReviewSubmitting(true);
    const updated = updateClaimTicketReview(ticketId, ratingInput, commentInput);
    if (updated) {
      setEditingReviewId(null);
      setSuccessToast(t('profile.reviewSuccess') || 'Review submitted successfully! Thank you for your feedback.');
      setTimeout(() => setSuccessToast(null), 4000);
    }
    setReviewSubmitting(false);
  };

  // Mark ticket as redeemed
  const handleMarkRedeemed = (ticketId: string) => {
    markClaimTicketRedeemed(ticketId);
    setSuccessToast(t('profile.markedRedeemed') || 'Ticket marked as redeemed.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (activeTab === 'active') return t.status === 'claimed';
    if (activeTab === 'ready') return t.status === 'paid';
    if (activeTab === 'reviewed') return Boolean(t.rating);
    return true;
  });

  const activeCount = tickets.filter((t) => t.status === 'claimed').length;
  const readyCount = tickets.filter((t) => t.status === 'paid').length;
  const reviewedCount = tickets.filter((t) => Boolean(t.rating)).length;

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getStarRatingLabel = (stars: number) => {
    switch (stars) {
      case 1:
        return t('profile.star1') || 'Poor';
      case 2:
        return t('profile.star2') || 'Fair';
      case 3:
        return t('profile.star3') || 'Good';
      case 4:
        return t('profile.star4') || 'Very Good';
      case 5:
        return t('profile.star5') || 'Excellent!';
      default:
        return '';
    }
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-400 font-semibold">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Show message if not authenticated (shouldn't reach here due to redirect, but just in case)
  if (!user && isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <UserIcon className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
          <p className="text-sm text-slate-400 mb-6">
            Please sign in to view your claims and profile.
          </p>
          <Link
            href="/login?redirect=/profile"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-lg"
          >
            <UserIcon className="w-4 h-4" />
            Sign In / Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05070C] via-[#0A0D12] to-[#0F131C] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-30 px-4 md:px-8 py-4 flex items-center justify-between shadow-lg shadow-black/10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg min-h-[38px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('profile.backHome') || 'Back to Deals'}</span>
          </Link>
          <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
          <span className="text-sm font-bold text-white hidden sm:inline">
            <span className="text-yellow-400">Tirf</span> Market Profile
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors min-h-[38px]"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{t('profile.exploreMore') || 'Explore More Deals'}</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-4xl flex-1">
        {/* Success Toast */}
        {successToast && (
          <div className="mb-6 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 p-4 rounded-2xl flex items-center gap-3 shadow-lg animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold">{successToast}</span>
          </div>
        )}

        {/* Merchant Portal Banner */}
        {isMerchant && (
          <section className="mb-8 p-6 bg-emerald-950/40 border border-emerald-500/30 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">Merchant Account Active</h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{merchantRating.average.toFixed(1)}</span>
                    <span className="text-slate-400 font-normal">({merchantRating.count} reviews)</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Claim vouchers are for buyers. Manage your shop, check counter redemptions, and post deals on your Merchant Dashboard.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0 whitespace-nowrap min-h-[40px] flex items-center justify-center"
            >
              Go to Merchant Dashboard
            </Link>
          </section>
        )}

        {/* Profile Card */}
        <section className="bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border border-slate-700/50 rounded-[2rem] p-6 md:p-8 mb-10 shadow-2xl shadow-black/20 relative overflow-hidden backdrop-blur-xl">
          {/* Ambient glow effect */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-700/50">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-[1.25rem] bg-gradient-to-tr from-emerald-600 via-emerald-500 to-cyan-400 text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-emerald-950/40 shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <span className="relative z-10">
                  {profileName
                    ? profileName.charAt(0).toUpperCase()
                    : user?.email
                    ? user.email.charAt(0).toUpperCase()
                    : <UserIcon className="w-9 h-9" />}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    {profileName || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : (t('profile.defaultBuyer') || 'Customer'))}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm shadow-emerald-500/10">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isMerchant ? 'Merchant Account' : (t('profile.verifiedBuyer') || 'Verified Buyer')}
                  </span>
                </div>
                <p className="text-sm md:text-base text-slate-400 mt-2">
                  {user?.email || (t('profile.guestNotice') || 'Active device wallet for instant counter redemptions')}
                </p>
              </div>
            </div>

            {!user && isSupabaseConfigured && (
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors border border-slate-700"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>{t('header.signin') || 'Sign In / Register'}</span>
              </Link>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 relative z-10">
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-[1.25rem] p-5 text-center backdrop-blur-sm hover:border-slate-600/50 transition-all group">
              <div className="text-3xl md:text-4xl font-black text-white font-mono group-hover:scale-105 transition-transform">
                {tickets.length}
              </div>
              <div className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">
                {t('profile.totalClaims') || 'Total Claims'}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-950/30 to-slate-900/40 border border-amber-500/40 rounded-[1.25rem] p-5 text-center backdrop-blur-sm hover:border-amber-500/50 transition-all group shadow-lg shadow-amber-950/20">
              <div className="text-3xl md:text-4xl font-black text-amber-400 font-mono group-hover:scale-105 transition-transform">
                {activeCount}
              </div>
              <div className="text-[11px] md:text-xs font-bold text-amber-300 uppercase tracking-wider mt-2">
                Active Holds
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-950/30 to-slate-900/40 border border-emerald-500/40 rounded-[1.25rem] p-5 text-center backdrop-blur-sm hover:border-emerald-500/50 transition-all group shadow-lg shadow-emerald-950/20">
              <div className="text-3xl md:text-4xl font-black text-emerald-400 font-mono group-hover:scale-105 transition-transform">
                {readyCount}
              </div>
              <div className="text-[11px] md:text-xs font-bold text-emerald-400 uppercase tracking-wider mt-2">
                {t('profile.readyToRedeem') || 'Ready to Redeem'}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/50 rounded-[1.25rem] p-5 text-center backdrop-blur-sm hover:border-slate-600/50 transition-all group">
              <div className="text-3xl md:text-4xl font-black text-amber-400 font-mono group-hover:scale-105 transition-transform">
                {reviewedCount}
              </div>
              <div className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">
                {t('profile.reviewsGiven') || 'Reviews Given'}
              </div>
            </div>
          </div>
        </section>

        {/* Claim Tickets Section */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-emerald-400" />
                </div>
                <span>{t('profile.claimTicketsTitle') || 'My Claim Tickets & Vouchers'}</span>
              </h2>
              <p className="text-sm md:text-base text-slate-400 mt-2.5">
                Present active holds to pay with M-PESA at shop counters or rate your past experiences.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 p-1.5 rounded-[1rem] self-start sm:self-auto flex-wrap shadow-lg shadow-black/10">
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all min-h-[40px] cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-950/30'
                    : 'text-amber-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Active Holds ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ready')}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all min-h-[40px] cursor-pointer ${
                  activeTab === 'ready'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-950/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {t('profile.tabReady') || 'Ready to Redeem'} ({readyCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all min-h-[40px] cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-950/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {t('profile.tabAll') || 'All'} ({tickets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reviewed')}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all min-h-[40px] cursor-pointer ${
                  activeTab === 'reviewed'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-950/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {t('profile.tabReviewed') || 'Reviewed'} ({reviewedCount})
              </button>
            </div>
          </div>

          {/* Empty State */}
          {filteredTickets.length === 0 && (
            <div className="bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-900/20 border border-slate-700/50 rounded-[2rem] p-16 text-center space-y-6 backdrop-blur-sm shadow-lg shadow-black/10">
              <div className="w-20 h-20 mx-auto rounded-[1.25rem] bg-gradient-to-br from-slate-800/60 to-slate-800/30 text-slate-400 flex items-center justify-center border border-slate-700/50 shadow-lg shadow-black/20">
                <Ticket className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-white">
                {isMerchant
                  ? 'Claim tickets are for buyers'
                  : (t('profile.noTicketsTitle') || 'No claim tickets found in this tab')}
              </h3>
              <p className="text-sm md:text-base text-slate-300 max-w-md mx-auto leading-relaxed">
                {isMerchant
                  ? 'Your account is registered as a merchant. Customers present tickets at your counter to redeem offers.'
                  : (t('profile.noTicketsDesc') || 'Explore deals nearby in Addis Ababa to claim discounts and pay with M-PESA.')}
              </p>
              {isMerchant ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-extrabold px-6 py-3.5 rounded-[0.875rem] transition-all min-h-[48px] shadow-lg shadow-emerald-950/40"
                >
                  <Store className="w-5 h-5" />
                  <span>Go to Merchant Dashboard</span>
                </Link>
              ) : (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-extrabold px-6 py-3.5 rounded-[0.875rem] transition-all min-h-[48px] shadow-lg shadow-emerald-950/40"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>{t('profile.browseDeals') || 'Browse Nearby Deals'}</span>
                </Link>
              )}
            </div>
          )}

          {/* Ticket Cards Grid */}
          <div className="space-y-8">
            {filteredTickets.map((ticket) => {
              const isClaimed = ticket.status === 'claimed';
              const isPaid = ticket.status === 'paid';
              const isRedeemed = ticket.status === 'redeemed';
              const isExpired = ticket.status === 'expired';

              let secondsLeft = 0;
              if (isClaimed && ticket.holdExpiresAt) {
                secondsLeft = Math.max(0, Math.floor((new Date(ticket.holdExpiresAt).getTime() - currentTime) / 1000));
              }

              return (
              <div
                key={ticket.id}
                className={`bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/40 border rounded-[2rem] overflow-hidden shadow-2xl shadow-black/20 transition-all backdrop-blur-xl hover:shadow-black/30 ${
                  isClaimed ? 'border-amber-500/60 shadow-amber-950/20' : isExpired ? 'border-rose-900/50 opacity-80' : 'border-slate-700/50 hover:border-slate-600/60'
                }`}
              >
                {/* Ticket Top Header */}
                <div className="p-6 md:p-7 bg-slate-900/70 backdrop-blur-sm border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-[0.875rem] flex items-center justify-center shrink-0 ${
                      isClaimed ? 'bg-amber-500/15 text-amber-400 border-2 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400 border-2 border-emerald-500/30'
                    }`}>
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-white text-lg">
                          {ticket.merchantName}
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                          {t('deal.approvedShop') || 'Approved shop'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {isClaimed
                          ? `Claimed ${formatDateTime(ticket.claimedAt)}`
                          : isPaid
                          ? `Paid ${formatDateTime(ticket.paidAt)}`
                          : isRedeemed
                          ? `Redeemed ${formatDateTime(ticket.redeemedAt || ticket.paidAt)}`
                          : 'Hold Expired (Unpaid)'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {isClaimed ? (
                      <span
                        className={`inline-flex items-center gap-2 text-xs font-mono font-extrabold px-4 py-2.5 rounded-full uppercase tracking-wider border shadow-lg ${
                          secondsLeft <= 180
                            ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white border-rose-400/30 animate-pulse shadow-rose-950/40'
                            : 'bg-gradient-to-r from-amber-600 to-amber-500 text-white border-amber-400/30 shadow-amber-950/40'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        <span>
                          Active Hold: {Math.floor(secondsLeft / 60)}m {secondsLeft % 60 < 10 ? '0' : ''}{secondsLeft % 60}s
                        </span>
                      </span>
                    ) : isPaid ? (
                      <span className="inline-flex items-center gap-2 text-xs font-extrabold px-4 py-2.5 rounded-full uppercase tracking-wider border bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-emerald-400/30 shadow-lg shadow-emerald-950/40">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t('profile.readyToRedeem') || 'Ready to Redeem'}</span>
                      </span>
                    ) : isRedeemed ? (
                      <span className="inline-flex items-center gap-2 text-xs font-extrabold px-4 py-2.5 rounded-full uppercase tracking-wider border bg-slate-700/60 text-slate-300 border-slate-600/60 shadow-lg shadow-black/20">
                        <Check className="w-4 h-4" />
                        <span>{t('profile.redeemed') || 'Redeemed'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-xs font-extrabold px-4 py-2.5 rounded-full uppercase tracking-wider border bg-rose-950/50 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-950/40">
                        <XCircle className="w-4 h-4" />
                        <span>Expired • Quota Returned</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Ticket Body */}
                <div className="p-6 md:p-8 space-y-8">
                  {/* Deal Title & Amount */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                        {isClaimed ? 'Reserved Offer (Pay at Counter)' : t('dashboard.dealTitle') || 'Claimed Deal'}
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
                        {ticket.dealTitle}
                      </h3>
                      {ticket.itemCode && (
                        <div className="text-sm font-mono text-slate-400 mt-2">
                          Item Code: <span className="text-slate-200 font-bold">{ticket.itemCode}</span>
                        </div>
                      )}
                    </div>
                    <div className="sm:text-right">
                      <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                        {isClaimed ? 'Due at Counter' : t('dashboard.amount') || 'Amount Paid'}
                      </div>
                      <div className={`text-3xl md:text-4xl font-black font-mono ${isClaimed ? 'text-amber-400' : isExpired ? 'text-slate-500' : 'text-emerald-400'}`}>
                        {ticket.amount.toLocaleString()} <span className="text-base font-bold text-slate-300">ETB</span>
                      </div>
                    </div>
                  </div>

                  {/* VOUCHER REDEMPTION PASS (High-Contrast Counter Presentation) */}
                  <div className={`border-2 rounded-[1.5rem] p-6 md:p-8 relative overflow-hidden shadow-xl ${
                    isClaimed
                      ? 'bg-gradient-to-br from-amber-950/30 to-slate-950 border-amber-500/50 shadow-amber-950/30'
                      : isExpired
                      ? 'bg-slate-950/60 border-rose-950/60'
                      : 'bg-gradient-to-br from-emerald-950/30 to-slate-950 border-emerald-500/40 shadow-emerald-950/30'
                  }`}>
                    {/* Ambient glow */}
                    {!isExpired && (
                      <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] rounded-full pointer-events-none ${
                        isClaimed ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                      }`}></div>
                    )}

                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        {!isExpired && (
                          <div className="shrink-0 p-3 bg-white rounded-[1rem] shadow-xl">
                            <QrCodeSvg value={ticket.redemptionCode} size={100} />
                          </div>
                        )}
                        <div className="space-y-2.5">
                          <div className={`text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-2 ${
                            isClaimed ? 'text-amber-400' : isExpired ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            <Sparkles className="w-4 h-4" />
                            <span>
                              {isClaimed
                                ? 'Counter Reservation Pass'
                                : isExpired
                                ? 'Hold Expired'
                                : t('mpesa.oneTimeCode') || 'Counter Redemption Code'}
                            </span>
                          </div>
                          <div className={`font-mono text-3xl md:text-4xl font-black tracking-widest selection:bg-emerald-600 ${
                            isExpired ? 'text-slate-500 line-through' : 'text-white'
                          }`}>
                            {ticket.redemptionCode}
                          </div>
                          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                            {isClaimed ? (
                              <span>
                                Present this code at <strong className="text-white">{ticket.merchantName}</strong>. Pay with M-PESA at the counter within {ticket.holdMinutes || 30} minutes. If unpaid, quota is automatically restored to the shop.
                              </span>
                            ) : isExpired ? (
                              <span>
                                This hold expired. The 1 unit quota was restored to {ticket.merchantName}&apos;s available offers.
                              </span>
                            ) : (
                              t('mpesa.showCodeAtCounter') || 'Show this code at the counter to redeem your deal.'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {isClaimed && (
                          <button
                            type="button"
                            onClick={() => setSelectedTicketForPayment(ticket)}
                            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] text-white text-sm font-extrabold px-6 py-3.5 rounded-[0.875rem] transition-all shadow-xl shadow-emerald-950/40 flex items-center gap-2 min-h-[48px] cursor-pointer border border-emerald-400/20"
                          >
                            <span>Pay with M-PESA at Counter</span>
                          </button>
                        )}

                        {!isExpired && (
                          <button
                            type="button"
                            onClick={() => handleCopy(ticket.redemptionCode, ticket.id)}
                            className="bg-slate-800/80 hover:bg-slate-700 text-white text-sm font-bold px-5 py-3.5 rounded-[0.875rem] transition-all shadow-lg flex items-center gap-2 min-h-[48px] cursor-pointer border border-slate-600/50 backdrop-blur-sm"
                          >
                            {copiedCodeId === ticket.id ? (
                              <>
                                <Check className="w-4.5 h-4.5 text-emerald-200" />
                                <span>{t('mpesa.codeCopied') || 'Copied!'}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4.5 h-4.5" />
                                <span>{t('mpesa.copyCode') || 'Copy Code'}</span>
                              </>
                            )}
                          </button>
                        )}

                        {isClaimed && (
                          <button
                            type="button"
                            onClick={() => handleCancelHold(ticket.id)}
                            className="bg-slate-900/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 text-sm font-semibold px-4 py-3.5 rounded-[0.875rem] transition-all min-h-[48px] border border-slate-700/60 hover:border-rose-900/60 backdrop-blur-sm"
                            title="Release hold early"
                          >
                            <span>Cancel Hold</span>
                          </button>
                        )}

                        {isPaid && (
                          <button
                            type="button"
                            onClick={() => handleMarkRedeemed(ticket.id)}
                            className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-sm font-semibold px-4 py-3.5 rounded-[0.875rem] transition-all min-h-[48px] border border-slate-600/50 backdrop-blur-sm"
                            title="Mark as picked up"
                          >
                            <span>{t('profile.markPickedUp') || 'Mark Picked Up'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Receipt & Order Metadata */}
                    <div className="mt-5 pt-5 border-t border-slate-700/50 flex flex-wrap items-center gap-5 text-xs font-mono text-slate-400">
                      {ticket.receipt && (
                        <div>
                          <span className="text-slate-500 font-bold uppercase tracking-wider">Receipt:</span>{' '}
                          <span className="text-slate-200 font-bold">{ticket.receipt}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Order ID:</span>{' '}
                        <span className="text-slate-200 font-bold">{ticket.orderId}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5-STAR RATING & REVIEW SECTION */}
                  <div className="pt-6 border-t border-slate-700/50">
                    {/* View existing review */}
                    {ticket.rating && editingReviewId !== ticket.id && (
                      <div className="bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-900/30 border border-slate-700/50 rounded-[1.5rem] p-6 md:p-7 flex flex-col sm:flex-row sm:items-start justify-between gap-5 backdrop-blur-sm shadow-lg shadow-black/10">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1 text-amber-400">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 ${
                                    star <= (ticket.rating || 0)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-extrabold text-amber-400">
                              {getStarRatingLabel(ticket.rating)}
                            </span>
                            {ticket.reviewedAt && (
                              <span className="text-xs text-slate-500 font-mono">
                                • {formatDateTime(ticket.reviewedAt)}
                              </span>
                            )}
                          </div>
                          {ticket.reviewComment ? (
                            <p className="text-base text-slate-200 leading-relaxed">
                              &ldquo;{ticket.reviewComment}&rdquo;
                            </p>
                          ) : (
                            <p className="text-sm text-slate-500 italic">
                              {t('profile.noWrittenReview') || 'Rating submitted without written comment.'}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartReview(ticket)}
                          className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700 px-4 py-2.5 rounded-xl transition-all shrink-0 min-h-[40px] border border-slate-700/60 backdrop-blur-sm shadow-sm"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>{t('profile.editReview') || 'Edit Review'}</span>
                        </button>
                      </div>
                    )}

                    {/* Review Form (New or Editing) */}
                    {(!ticket.rating || editingReviewId === ticket.id) && (
                      <div className="bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-900/30 border border-slate-700/50 rounded-[1.5rem] p-6 md:p-7 space-y-5 backdrop-blur-sm shadow-lg shadow-black/10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                              <MessageSquarePlus className="w-4.5 h-4.5 text-emerald-400" />
                            </div>
                            <h4 className="text-base font-black text-white">
                              {ticket.rating
                                ? (t('profile.editReviewTitle') || 'Update Your Review')
                                : (t('profile.leaveReviewTitle') || 'Rate & Review This Deal')}
                            </h4>
                          </div>
                          {editingReviewId === ticket.id && (
                            <button
                              type="button"
                              onClick={() => setEditingReviewId(null)}
                              className="text-sm text-slate-400 hover:text-white font-bold underline cursor-pointer"
                            >
                              {t('profile.cancel') || 'Cancel'}
                            </button>
                          )}
                        </div>

                        {/* Interactive Stars Selector */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const activeStars = hoverRating || ratingInput;
                              const isFilled = star <= activeStars;
                              return (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRatingInput(star)}
                                  onMouseEnter={() => setHoverRating(star)}
                                  onMouseLeave={() => setHoverRating(0)}
                                  className="p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                                  aria-label={`Rate ${star} stars`}
                                >
                                  <Star
                                    className={`w-8 h-8 transition-colors ${
                                      isFilled
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-slate-700 hover:text-slate-600'
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                          <span className="text-sm font-extrabold text-amber-400">
                            {getStarRatingLabel(hoverRating || ratingInput)}
                          </span>
                        </div>

                        {/* Review Comment Input */}
                        <div>
                          <textarea
                            rows={3}
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            placeholder={t('profile.reviewPlaceholder') || 'How was the deal? Quick counter redemption, great quality, recommended?'}
                            className="w-full bg-slate-900/60 border border-slate-700/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-[0.875rem] p-4 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all backdrop-blur-sm shadow-inner"
                          />
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={reviewSubmitting}
                            onClick={() => handleSubmitReview(ticket.id)}
                            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-slate-800 disabled:to-slate-700 text-white font-extrabold text-sm px-6 py-3 rounded-[0.875rem] transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 min-h-[44px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Star className="w-4 h-4 fill-current" />
                            <span>{t('profile.submitReview') || 'Submit Review'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </section>
      </main>

      {/* Counter M-PESA STK Payment Modal */}
      {selectedTicketForPayment && (
        <MpesaModal
          isOpen={true}
          onClose={() => {
            setSelectedTicketForPayment(null);
            refreshClaims();
          }}
          dealId={selectedTicketForPayment.dealId}
          dealTitle={selectedTicketForPayment.dealTitle}
          amount={selectedTicketForPayment.amount}
          merchantName={selectedTicketForPayment.merchantName}
          merchantId={selectedTicketForPayment.merchantId}
          claimTicketId={selectedTicketForPayment.id}
        />
      )}
    </div>
  );
}
