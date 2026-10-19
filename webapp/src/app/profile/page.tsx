'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
  PiggyBank,
  Lock,
  X,
  Phone,
  Save,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, profileName, isMerchant, loading: authLoading } = useAuth();
  const merchantRating = getRatingForMerchant(profileName || 'Bole Highland Cafe');

  // Customer Profile State
  const [displayName, setDisplayName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tm_customer_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.fullName) return parsed.fullName;
        }
      } catch {}
    }
    return profileName || user?.user_metadata?.full_name || '';
  });

  const [displayPhone, setDisplayPhone] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tm_customer_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.phoneNumber) return parsed.phoneNumber;
        }
      } catch {}
    }
    return user?.user_metadata?.phone_number || '';
  });

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [editPhoneInput, setEditPhoneInput] = useState('');
  const [editBioInput, setEditBioInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
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

  // Handle Customer Profile Edit Save
  const handleSaveCustomerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.updateUser({
          data: {
            full_name: editNameInput.trim(),
            phone_number: editPhoneInput.trim(),
          },
        });
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'tm_customer_profile',
          JSON.stringify({
            fullName: editNameInput.trim(),
            phoneNumber: editPhoneInput.trim(),
            bio: editBioInput.trim(),
          })
        );
      }
      setDisplayName(editNameInput.trim());
      setDisplayPhone(editPhoneInput.trim());
      setIsEditProfileOpen(false);
      setSuccessToast('Profile updated successfully!');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setProfileSaving(false);
    }
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

  // Total customer savings across all claimed tickets
  const totalSavedETB = tickets.reduce((sum, ticket) => {
    let original = ticket.originalPrice;
    if (!original && ticket.discountPct && ticket.discountPct > 0 && ticket.discountPct < 100) {
      original = Math.round(ticket.amount / (1 - ticket.discountPct / 100));
    }
    if (original && original > ticket.amount) {
      return sum + (original - ticket.amount);
    }
    return sum;
  }, 0);

  const totalOffersClaimed = tickets.length;

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

  // Show message if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Please sign in to view your claims, active counter vouchers, and saved deals.
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-blue-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-emerald-200/60 bg-white/80 backdrop-blur-xl sticky top-0 z-30 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg min-h-[38px] border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('profile.backHome') || 'Back to Deals'}</span>
          </Link>
          <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
          <span className="text-sm font-bold text-slate-900 hidden sm:inline">
            <span className="text-transparent bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text">Tirf</span> Market Profile
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors min-h-[38px]"
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
          <section className="mb-8 p-6 bg-gradient-to-br from-emerald-100 via-blue-50 to-violet-50 border border-emerald-200 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900">Merchant Account Active</h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{merchantRating.average.toFixed(1)}</span>
                    <span className="text-slate-600 font-normal">({merchantRating.count} reviews)</span>
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-0.5">
                  Claim vouchers are for buyers. Manage your shop, check counter redemptions, and post deals on your Merchant Dashboard.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0 whitespace-nowrap min-h-[40px] flex items-center justify-center"
            >
              Go to Merchant Dashboard
            </Link>
          </section>
        )}

        {/* Profile Card */}
        <section className="bg-white/90 border border-emerald-200 rounded-[2rem] p-6 md:p-8 mb-10 shadow-xl relative overflow-hidden backdrop-blur-xl">
          {/* Ambient glow effect */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-emerald-200/40 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-200/40 blur-[120px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-emerald-200">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-[1.25rem] bg-gradient-to-tr from-emerald-500 via-blue-500 to-violet-400 text-white flex items-center justify-center font-black text-3xl shadow-lg shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
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
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                    {displayName || (t('profile.defaultBuyer') || 'Customer')}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isMerchant ? 'Merchant Account' : (t('profile.verifiedBuyer') || 'Verified Buyer')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 mt-2 flex-wrap">
                  <span>{user?.email}</span>
                  {displayPhone && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-emerald-700 font-semibold">{displayPhone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditNameInput(displayName);
                setEditPhoneInput(displayPhone);
                setIsEditProfileOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-sm transition-all cursor-pointer self-start sm:self-auto shrink-0"
              title="Edit Profile"
            >
              <Edit3 className="w-4 h-4 text-emerald-600" />
              <span>Edit Profile</span>
            </button>
          </div>

          {/* Customer Savings & Claims Banner */}
          <div className="mt-8 p-6 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-[1.5rem] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-white/5 rounded-full pointer-events-none blur-2xl"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
                <PiggyBank className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider block">
                  {t('profile.totalSaved') || 'Total Money Saved'}
                </span>
                <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">
                  {totalSavedETB.toLocaleString()} <span className="text-base font-bold text-emerald-200">ETB</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:border-l sm:border-white/20 sm:pl-8 relative z-10">
              <div>
                <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider block">
                  {t('profile.offersClaimed') || 'Total Offers Claimed'}
                </span>
                <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">
                  {totalOffersClaimed} <span className="text-base font-bold text-emerald-200">{totalOffersClaimed === 1 ? 'offer' : 'offers'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 relative z-10">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-[1.25rem] p-5 text-center backdrop-blur-sm hover:border-emerald-300 transition-all group shadow-sm">
              <div className="text-3xl md:text-4xl font-black text-emerald-700 font-mono group-hover:scale-105 transition-transform">
                {totalOffersClaimed}
              </div>
              <div className="text-[11px] md:text-xs font-bold text-emerald-600 uppercase tracking-wider mt-2">
                {t('profile.offersClaimed') || 'Offers Claimed'}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 rounded-[1.25rem] p-5 text-center backdrop-blur-sm hover:border-orange-300 transition-all group shadow-sm">
              <div className="text-3xl md:text-4xl font-black text-orange-600 font-mono group-hover:scale-105 transition-transform">
                {activeCount}
              </div>
              <div className="text-[11px] md:text-xs font-bold text-orange-600 uppercase tracking-wider mt-2">
                Active Holds
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200 rounded-[1.25rem] p-5 text-center backdrop-blur-sm hover:border-rose-300 transition-all group shadow-sm">
              <div className="text-3xl md:text-4xl font-black text-rose-600 font-mono group-hover:scale-105 transition-transform">
                {readyCount}
              </div>
              <div className="text-[11px] md:text-xs font-bold text-rose-600 uppercase tracking-wider mt-2">
                {t('profile.readyToRedeem') || 'Ready to Redeem'}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-[1.25rem] p-5 text-center backdrop-blur-sm hover:border-blue-300 transition-all group shadow-sm">
              <div className="text-3xl md:text-4xl font-black text-amber-600 font-mono group-hover:scale-105 transition-transform">
                {reviewedCount}
              </div>
              <div className="text-[11px] md:text-xs font-bold text-blue-600 uppercase tracking-wider mt-2">
                {t('profile.reviewsGiven') || 'Reviews Given'}
              </div>
            </div>
          </div>
        </section>

        {/* Claim Tickets Section */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-emerald-600" />
                </div>
                <span>{t('profile.claimTicketsTitle') || 'My Claim Tickets & Vouchers'}</span>
              </h2>
              <p className="text-sm md:text-base text-slate-600 mt-2.5">
                Present active holds to pay with M-PESA at shop counters or rate your past experiences.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-slate-200 p-1.5 rounded-[1rem] self-start sm:self-auto flex-wrap shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all min-h-[40px] cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'text-orange-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Active Holds ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ready')}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all min-h-[40px] cursor-pointer ${
                  activeTab === 'ready'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t('profile.tabReady') || 'Ready to Redeem'} ({readyCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all min-h-[40px] cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t('profile.tabAll') || 'All'} ({tickets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reviewed')}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all min-h-[40px] cursor-pointer ${
                  activeTab === 'reviewed'
                    ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t('profile.tabReviewed') || 'Reviewed'} ({reviewedCount})
              </button>
            </div>
          </div>

          {/* Empty State */}
          {filteredTickets.length === 0 && (
            <div className="bg-white/90 border border-slate-200 rounded-[2rem] p-16 text-center space-y-6 backdrop-blur-sm shadow-lg">
              <div className="w-20 h-20 mx-auto rounded-[1.25rem] bg-gradient-to-br from-emerald-100 to-blue-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-md">
                <Ticket className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {isMerchant
                  ? 'Claim tickets are for buyers'
                  : (t('profile.noTicketsTitle') || 'No claim tickets found in this tab')}
              </h3>
              <p className="text-sm md:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
                {isMerchant
                  ? 'Your account is registered as a merchant. Customers present tickets at your counter to redeem offers.'
                  : (t('profile.noTicketsDesc') || 'Explore deals nearby in Addis Ababa to claim discounts and pay with M-PESA.')}
              </p>
              {isMerchant ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white text-sm font-extrabold px-6 py-3.5 rounded-[0.875rem] transition-all min-h-[48px] shadow-md"
                >
                  <Store className="w-5 h-5" />
                  <span>Go to Merchant Dashboard</span>
                </Link>
              ) : (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white text-sm font-extrabold px-6 py-3.5 rounded-[0.875rem] transition-all min-h-[48px] shadow-md"
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

              let originalPrice = ticket.originalPrice;
              if (!originalPrice && ticket.discountPct && ticket.discountPct > 0 && ticket.discountPct < 100) {
                originalPrice = Math.round(ticket.amount / (1 - ticket.discountPct / 100));
              }
              const ticketSavings = (originalPrice && originalPrice > ticket.amount) ? (originalPrice - ticket.amount) : 0;

              return (
              <div
                key={ticket.id}
                className={`bg-white/90 border rounded-[2rem] overflow-hidden shadow-lg transition-all backdrop-blur-xl hover:shadow-xl ${
                  isClaimed ? 'border-amber-500/60 shadow-amber-950/30' : isExpired ? 'border-rose-900/50 opacity-80' : 'border-violet-500/30 hover:border-violet-400/50'
                }`}
              >
                {/* Ticket Top Header */}
                <div className="p-6 md:p-7 bg-gradient-to-r from-emerald-50/50 to-blue-50/50 backdrop-blur-sm border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-[0.875rem] flex items-center justify-center shrink-0 ${
                      isClaimed ? 'bg-amber-100 text-amber-600 border-2 border-amber-200' : 'bg-emerald-100 text-emerald-600 border-2 border-emerald-200'
                    }`}>
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-900 text-lg">
                          {ticket.merchantName}
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
                          {t('deal.approvedShop') || 'Approved shop'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
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
                      <span className="inline-flex items-center gap-2 text-xs font-extrabold px-4 py-2.5 rounded-full uppercase tracking-wider border bg-slate-200 text-slate-700 border-slate-300 shadow-sm">
                        <Check className="w-4 h-4" />
                        <span>{t('profile.redeemed') || 'Redeemed'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-xs font-extrabold px-4 py-2.5 rounded-full uppercase tracking-wider border bg-rose-100 text-rose-700 border-rose-200 shadow-sm">
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
                      <div className="text-xs font-extrabold uppercase tracking-widest text-slate-600 mb-2">
                        {isClaimed ? 'Reserved Offer (Pay at Counter)' : t('dashboard.dealTitle') || 'Claimed Deal'}
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                        {ticket.dealTitle}
                      </h3>
                      {ticket.itemCode && (
                        <div className="text-sm font-mono text-slate-600 mt-2">
                          Item Code: <span className="text-slate-900 font-bold">{ticket.itemCode}</span>
                        </div>
                      )}
                    </div>
                    <div className="sm:text-right">
                      <div className="text-xs font-extrabold uppercase tracking-widest text-slate-600 mb-2">
                        {isClaimed ? 'Due at Counter' : t('dashboard.amount') || 'Amount Paid'}
                      </div>
                      <div className={`text-3xl md:text-4xl font-black font-mono ${isClaimed ? 'text-amber-600' : isExpired ? 'text-slate-500' : 'text-emerald-600'}`}>
                        {ticket.amount.toLocaleString()} <span className="text-base font-bold text-slate-600">ETB</span>
                      </div>
                      {ticketSavings > 0 && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg mt-2 shadow-sm">
                          <PiggyBank className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Saved {ticketSavings.toLocaleString()} ETB {ticket.discountPct ? `(${ticket.discountPct}% off)` : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* VOUCHER REDEMPTION PASS (High-Contrast Counter Presentation) */}
                  <div className={`border-2 rounded-[1.5rem] p-6 md:p-8 relative overflow-hidden shadow-lg ${
                    isClaimed
                      ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
                      : isExpired
                      ? 'bg-slate-100 border-rose-300'
                      : 'bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-300'
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
                            isClaimed ? 'text-amber-600' : isExpired ? 'text-rose-600' : 'text-emerald-600'
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
                            isExpired ? 'text-slate-500 line-through' : 'text-slate-900'
                          }`}>
                            {ticket.redemptionCode}
                          </div>
                          <p className="text-sm text-slate-700 max-w-md leading-relaxed">
                            {isClaimed ? (
                              <span>
                                Present this code at <strong className="text-slate-900">{ticket.merchantName}</strong>. Pay with M-PESA at the counter within {ticket.holdMinutes || 30} minutes. If unpaid, quota is automatically restored to the shop.
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
                            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] text-white text-sm font-extrabold px-6 py-3.5 rounded-[0.875rem] transition-all shadow-lg flex items-center gap-2 min-h-[48px] cursor-pointer border border-emerald-400/20"
                          >
                            <span>Pay with M-PESA at Counter</span>
                          </button>
                        )}

                        {!isExpired && (
                          <button
                            type="button"
                            onClick={() => handleCopy(ticket.redemptionCode, ticket.id)}
                            className="bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-5 py-3.5 rounded-[0.875rem] transition-all shadow-md flex items-center gap-2 min-h-[48px] cursor-pointer border border-slate-200"
                          >
                            {copiedCodeId === ticket.id ? (
                              <>
                                <Check className="w-4.5 h-4.5 text-emerald-600" />
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
                            className="bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-sm font-semibold px-4 py-3.5 rounded-[0.875rem] transition-all min-h-[48px] border border-slate-200 hover:border-rose-300"
                            title="Release hold early"
                          >
                            <span>Cancel Hold</span>
                          </button>
                        )}

                        {isPaid && (
                          <button
                            type="button"
                            onClick={() => handleMarkRedeemed(ticket.id)}
                            className="bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-3.5 rounded-[0.875rem] transition-all min-h-[48px] border border-slate-200"
                            title="Mark as picked up"
                          >
                            <span>{t('profile.markPickedUp') || 'Mark Picked Up'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Receipt & Order Metadata */}
                    <div className="mt-5 pt-5 border-t border-slate-200 flex flex-wrap items-center gap-5 text-xs font-mono text-slate-600">
                      {ticket.receipt && (
                        <div>
                          <span className="text-slate-500 font-bold uppercase tracking-wider">Receipt:</span>{' '}
                          <span className="text-slate-900 font-bold">{ticket.receipt}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500 font-bold uppercase tracking-wider">Order ID:</span>{' '}
                        <span className="text-slate-900 font-bold">{ticket.orderId}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5-STAR RATING & REVIEW SECTION */}
                  <div className="pt-6 border-t border-slate-200">
                    {/* View existing review */}
                    {ticket.rating && editingReviewId !== ticket.id && (
                      <div className="bg-white/90 border border-slate-200 rounded-[1.5rem] p-6 md:p-7 flex flex-col sm:flex-row sm:items-start justify-between gap-5 backdrop-blur-sm shadow-md">
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
                            <span className="text-sm font-extrabold text-amber-600">
                              {getStarRatingLabel(ticket.rating)}
                            </span>
                            {ticket.reviewedAt && (
                              <span className="text-xs text-slate-500 font-mono">
                                • {formatDateTime(ticket.reviewedAt)}
                              </span>
                            )}
                          </div>
                          {ticket.reviewComment ? (
                            <p className="text-base text-slate-700 leading-relaxed">
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
                          className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-4 py-2.5 rounded-xl transition-all shrink-0 min-h-[40px] border border-emerald-200"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>{t('profile.editReview') || 'Edit Review'}</span>
                        </button>
                      </div>
                    )}

                    {/* Review Form (New or Editing) */}
                    {(!ticket.rating || editingReviewId === ticket.id) && (
                      <div className="bg-gradient-to-br from-orange-50 via-rose-50 to-pink-50 border border-orange-200 rounded-[1.5rem] p-6 md:p-7 space-y-5 backdrop-blur-sm shadow-md">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center">
                              <MessageSquarePlus className="w-4.5 h-4.5 text-orange-600" />
                            </div>
                            <h4 className="text-base font-black text-slate-900">
                              {ticket.rating
                                ? (t('profile.editReviewTitle') || 'Update Your Review')
                                : (t('profile.leaveReviewTitle') || 'Rate & Review This Deal')}
                            </h4>
                          </div>
                          {editingReviewId === ticket.id && (
                            <button
                              type="button"
                              onClick={() => setEditingReviewId(null)}
                              className="text-sm text-slate-600 hover:text-slate-900 font-bold underline cursor-pointer"
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
                                        ? 'fill-amber-500 text-amber-500'
                                        : 'text-slate-300 hover:text-slate-400'
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                          <span className="text-sm font-extrabold text-amber-600">
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
                            className="w-full bg-white border border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 rounded-[0.875rem] p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
                          />
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={reviewSubmitting}
                            onClick={() => handleSubmitReview(ticket.id)}
                            className="bg-gradient-to-r from-orange-600 to-rose-500 hover:from-orange-500 hover:to-rose-400 disabled:from-slate-300 disabled:to-slate-400 text-white font-extrabold text-sm px-6 py-3 rounded-[0.875rem] transition-all shadow-md flex items-center gap-2 min-h-[44px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Customer Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-7 border border-slate-200 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">Edit Customer Profile</h3>
                  <p className="text-xs text-slate-500">Update your buyer account details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  placeholder="e.g. Bethlehem Tadesse"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={editPhoneInput}
                    onChange={(e) => setEditPhoneInput(e.target.value)}
                    placeholder="e.g. 0700404709 or +251 911 234567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all pl-10"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Used for counter verification & M-PESA payment receipts.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Neighborhood / City Note (Optional)
                </label>
                <input
                  type="text"
                  value={editBioInput}
                  onChange={(e) => setEditBioInput(e.target.value)}
                  placeholder="e.g. Bole Medhanialem, Addis Ababa"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{profileSaving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
