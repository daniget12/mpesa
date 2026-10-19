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
  attachDealPerformance,
  DashboardStats,
  DashboardOrder,
  MerchantMe,
  MerchantDeal,
  CreateDealPayload,
  DashboardApiError,
  MerchantStatus,
} from '@/lib/dashboardApi';
import {
  mapRedeemResponse,
  formatRedeemedAt,
  DASH,
  type RedeemResult,
} from '@/lib/redeemMapper';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
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
  Lock,
  Eye,
  EyeOff,
  Key,
  MapPin,
  Edit3,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { notifyCustomerNewDealNearby } from '@/lib/notifications';
import {
  verifyMerchantPassword,
  setMerchantPassword,
  hasMerchantPassword,
  getSavedMerchantToken,
} from '@/lib/merchantAuth';
import {
  getApprovedMerchantProfile,
  getPendingUpdateForMerchant,
  submitMerchantProfileUpdate,
  type MerchantProfileUpdate,
} from '@/lib/merchantProfileUpdates';

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
  const [authMethod, setAuthMethod] = useState<'password' | 'otp' | 'set-password'>('password');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [codeInput, setCodeInput] = useState<string>('');
  const [codeSent, setCodeSent] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // Password Management Modal State (Set / Change password)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [passwordModalSuccess, setPasswordModalSuccess] = useState<string | null>(null);
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);
  const [passwordModalLoading, setPasswordModalLoading] = useState<boolean>(false);

  // Merchant Profile Editing & Admin Approval State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [pendingProfileUpdate, setPendingProfileUpdate] = useState<MerchantProfileUpdate | null>(null);
  const [profileUpdateBannerDismissed, setProfileUpdateBannerDismissed] = useState<boolean>(false);
  const [editShopName, setEditShopName] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('Café');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editContactPhone, setEditContactPhone] = useState<string>('');
  const [editTinNumber, setEditTinNumber] = useState<string>('');
  const [editTillNumber, setEditTillNumber] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editPinLocation, setEditPinLocation] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

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
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null);
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

  // Approved Profile Overrides from Admin Approvals
  const approvedProfile = useMemo(() => {
    if (!merchant) return null;
    return getApprovedMerchantProfile(merchant.id) || getApprovedMerchantProfile(merchant.email);
  }, [merchant]);

  const effectiveShopName = approvedProfile?.proposedShopName || merchant?.shopName || merchant?.name || 'Merchant Portal';
  const effectiveCategory = approvedProfile?.category || merchant?.category || 'Cafe';
  const effectiveAddress = approvedProfile?.address || 'Bole Medhanialem, Behind Edna Mall, Addis Ababa';
  const effectivePhone = approvedProfile?.contactPhone || '+251 791 234567';
  const effectiveTin = approvedProfile?.tinNumber || '0019283746';
  const effectiveTill = approvedProfile?.tillNumber || '884920';

  // Listen for admin profile approval / pending status changes
  useEffect(() => {
    const refreshProfileStatus = () => {
      if (merchant) {
        const pending = getPendingUpdateForMerchant(merchant.id) || getPendingUpdateForMerchant(merchant.email);
        setPendingProfileUpdate(pending);
      }
    };
    refreshProfileStatus();
    window.addEventListener('tirf_merchant_updates_changed', refreshProfileStatus);
    window.addEventListener('tirf_approved_merchant_changed', refreshProfileStatus);
    return () => {
      window.removeEventListener('tirf_merchant_updates_changed', refreshProfileStatus);
      window.removeEventListener('tirf_approved_merchant_changed', refreshProfileStatus);
    };
  }, [merchant]);

  // Open Edit Profile Modal
  const handleOpenEditProfile = () => {
    setEditShopName(approvedProfile?.proposedShopName || merchant?.shopName || merchant?.name || '');
    setEditCategory(approvedProfile?.category || merchant?.category || 'Café');
    setEditAddress(approvedProfile?.address || 'Bole Medhanialem, Behind Edna Mall, Addis Ababa');
    setEditContactPhone(approvedProfile?.contactPhone || '+251 791 234567');
    setEditTinNumber(approvedProfile?.tinNumber || '0019283746');
    setEditTillNumber(approvedProfile?.tillNumber || '884920');
    setEditDescription(
      approvedProfile?.description ||
      'Quality specialty coffee, daily fresh baked goods, and fast customer pickup in Bole.'
    );
    setEditPinLocation(approvedProfile?.mapCoords || { x: 50, y: 50 });
    setEditSuccessMsg(null);
    setEditErrorMsg(null);
    setIsEditProfileOpen(true);
  };

  // Submit Profile Edits for Admin Approval
  const handleSubmitProfileEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;

    if (!editShopName.trim()) {
      setEditErrorMsg('Shop name is required.');
      return;
    }

    setEditSubmitting(true);
    setEditErrorMsg(null);
    setEditSuccessMsg(null);

    try {
      const updateRecord = submitMerchantProfileUpdate({
        merchantId: merchant.id || merchant.email || 'merchant_portal',
        merchantEmail: merchant.email,
        currentShopName: merchant.shopName || merchant.name || 'Merchant Shop',
        proposedShopName: editShopName.trim(),
        category: editCategory,
        address: editAddress.trim(),
        contactPhone: editContactPhone.trim(),
        tinNumber: editTinNumber.trim(),
        tillNumber: editTillNumber.trim(),
        description: editDescription.trim(),
        mapCoords: editPinLocation,
      });

      setPendingProfileUpdate(updateRecord);
      setProfileUpdateBannerDismissed(false);
      setEditSuccessMsg('Profile update submitted for Administrator approval! Changes will go live once verified.');
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setEditSuccessMsg(null);
      }, 1500);
    } catch {
      setEditErrorMsg('Failed to submit profile updates. Please try again.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Password Sign-In (Default)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !passwordInput) return;

    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      const res = await verifyMerchantPassword(cleanEmail, passwordInput);
      if (!res.success) {
        if (res.notFound) {
          setAuthError('No password has been set for this shop yet. Click "Sign in with one-time code" below to verify and create your password.');
        } else {
          setAuthError(res.error || 'Invalid email or password.');
        }
        return;
      }

      // Check token
      const sessionToken = res.token || getSavedMerchantToken(cleanEmail) || getStoredToken();
      if (sessionToken) {
        setToken(sessionToken);
        setLoading(true);
        const me = await fetchMerchantMe(sessionToken);
        setMerchant(me);
        if (me.status === 'approved') {
          await fetchStats(sessionToken, true);
          await loadDeals(sessionToken);
        }
      } else {
        // In case no cached token exists on this device yet, prompt OTP once to bind device
        setAuthError('Password verified! A one-time verification code is required once on this browser to link your shop session.');
        setAuthMethod('otp');
      }
    } catch (err: unknown) {
      if (err instanceof DashboardApiError) {
        setAuthError(err.message);
      } else {
        setAuthError('Could not log in with password. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Save / Change Merchant Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setPasswordModalError('Password must be at least 6 characters long.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordModalError('Passwords do not match.');
      return;
    }

    const targetEmail = (merchant?.email || emailInput).trim().toLowerCase();
    if (!targetEmail) {
      setPasswordModalError('No merchant email address detected.');
      return;
    }

    setPasswordModalLoading(true);
    setPasswordModalError(null);
    setPasswordModalSuccess(null);

    try {
      const res = await setMerchantPassword(
        targetEmail,
        newPasswordInput,
        merchant?.shopName || merchant?.name,
        token || undefined
      );

      if (res.success) {
        setPasswordModalSuccess('Password successfully saved! You can now log in directly using this password.');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordModalSuccess(null);
          setNewPasswordInput('');
          setConfirmPasswordInput('');
        }, 1500);
      } else {
        setPasswordModalError(res.error || 'Failed to save password.');
      }
    } catch (err: unknown) {
      setPasswordModalError(err instanceof Error ? err.message : 'Failed to save password.');
    } finally {
      setPasswordModalLoading(false);
    }
  };

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

        // If they don't have a password set, prompt them
        if (!hasMerchantPassword(emailInput.trim().toLowerCase())) {
          setIsPasswordModalOpen(true);
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
    setPasswordInput('');
    setCodeInput('');
    setAuthError(null);
    setAuthMessage(null);
    setStatusOverride(null);
    setRedeemResult(null);
    setRedeemCodeInput('');
    setIsPasswordModalOpen(false);
    setAuthMethod('password');
  };

  // Handle Redeem / Verify Code (Live POST /api/merchant/redeem)
  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = redeemCodeInput.trim().toUpperCase();
    if (!code) return;

    setRedeemLoading(true);
    setRedeemResult(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tirfmarket-backend.onrender.com';
      const authToken = token || getStoredToken();
      const res = await fetch(`${backendUrl}/api/merchant/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => null);
      const result = mapRedeemResponse(res.status, body);
      setRedeemResult(result);

      if (result.kind === 'success') {
        setRedeemCodeInput('');
        // Refresh stats immediately after successful redemption
        if (authToken) {
          fetchStats(authToken, false);
        }
      }
    } catch {
      setRedeemResult(mapRedeemResponse(0, null));
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

      // Notify customers on the website that a new deal was posted
      notifyCustomerNewDealNearby({
        id: created.id || `deal_${Date.now()}`,
        title: created.title,
        merchantName: merchant?.shopName || merchant?.name || 'Local Merchant',
        discountPct: created.discountPct,
        finalAmount: created.finalAmount,
        distanceMeters: 180,
      });

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

  // Enriched deals with individual claim counts and earnings
  const enrichedDeals = useMemo(() => {
    return attachDealPerformance(deals, stats?.recent || []);
  }, [deals, stats?.recent]);

  // Overall deal claim and earnings summary
  const totalDealsClaimedCount = stats?.dealsRedeemed ?? (stats?.recent?.length || 0);
  const totalEarnedAmount = stats?.cashlessSales ?? (stats?.recent?.reduce((sum, o) => sum + o.amount, 0) || 0);

  // Render Login Form in Live Mode when unauthenticated
  if (!token) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col font-sans relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px] bg-white blur-[130px] rounded-full pointer-events-none -z-10" />

        <header className="border-b border-gray-200/80 bg-white/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tirf Market</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight">
              <span className="text-emerald-600">Tirf</span>Market <span className="text-gray-700 font-semibold text-sm">Merchant Hub</span>
            </span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gradient-to-b bg-white border border-gray-200/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-white border border-emerald-500/20 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/15">
                {authMethod === 'otp' ? <KeyRound className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
              </div>
              <h1 className="text-2xl font-black text-black mb-2">
                {authMethod === 'otp' ? 'One-Time Sign In' : t('dashboard.loginTitle')}
              </h1>
              <p className="text-gray-700 text-xs sm:text-sm">
                {authMethod === 'otp'
                  ? 'Enter your shop email to receive a 6-digit verification code.'
                  : 'Sign in directly with your registered shop email and password.'}
              </p>
            </div>

            {authError && (
              <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-700 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                <span>{authError}</span>
              </div>
            )}

            {authMessage && (
              <div className="mb-6 bg-white border border-emerald-500/30 text-emerald-700 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                <span>{authMessage}</span>
              </div>
            )}

            {authMethod === 'password' ? (
              /* PASSWORD SIGN-IN (DEFAULT) */
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
                    {t('dashboard.email')}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="merchant@yourshop.et"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all pl-11 text-sm"
                    />
                    <Mail className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('otp');
                        setAuthError(null);
                        setAuthMessage(null);
                      }}
                      className="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer"
                    >
                      Forgot / Set Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all pl-11 pr-11 text-sm"
                    />
                    <Lock className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 disabled:opacity-50 text-sm"
                >
                  {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  <span>Sign In to Dashboard</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('otp');
                      setAuthError(null);
                      setAuthMessage(null);
                    }}
                    className="text-xs text-gray-600 hover:text-emerald-700 font-semibold cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>Sign in with one-time email code instead</span>
                  </button>
                </div>
              </form>
            ) : (
              /* OTP VERIFICATION CODE (RECOVERY OR INITIAL PROMPT) */
              <>
                {!codeSent ? (
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
                        {t('dashboard.email')}
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="merchant@yourshop.et"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all pl-11 text-sm"
                        />
                        <Mail className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
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

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('password');
                          setAuthError(null);
                          setAuthMessage(null);
                        }}
                        className="text-xs text-gray-600 hover:text-emerald-700 font-semibold cursor-pointer inline-flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Password Login</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
                        {t('dashboard.code')}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-center text-2xl font-mono tracking-widest text-emerald-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                      <p className="text-[11px] text-gray-700 text-center mt-1">
                        Sent to <span className="font-semibold text-black">{emailInput}</span>
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

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCodeSent(false);
                          setCodeInput('');
                          setAuthError(null);
                        }}
                        className="text-xs text-gray-600 hover:text-black transition-colors text-center py-1 cursor-pointer"
                      >
                        Change email
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('password');
                          setCodeSent(false);
                          setAuthError(null);
                        }}
                        className="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer"
                      >
                        Password sign-in
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200/80 text-center">
              <p className="text-xs text-gray-700">
                {t('dashboard.newShop')}{' '}
                <Link
                  href="/merchant/register"
                  className="font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-4 transition-colors"
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
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
        <p className="text-gray-700 text-sm">Verifying merchant session...</p>
      </div>
    );
  }

  if (currentStatus === 'pending') {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col font-sans relative">
        <header className="border-b border-gray-200 bg-white/80 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-black">
            <ArrowLeft className="w-4 h-4" />
            <span>Tirf Market</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-black bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-block mb-3">
              Under Review
            </span>
            <h1 className="text-2xl font-black text-black mb-2">Application Under Review</h1>
            <p className="text-gray-700 text-sm mb-6">
              Your merchant application for <strong className="text-black">{merchant?.shopName || merchant?.name || 'your shop'}</strong> is currently under review by TirfMarket compliance. We verify business TIN and storefront information before activation.
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
              className="w-full bg-white hover:bg-white text-black font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
      <div className="min-h-screen bg-white text-black flex flex-col font-sans relative">
        <header className="border-b border-gray-200 bg-white/80 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-black">
            <ArrowLeft className="w-4 h-4" />
            <span>Tirf Market</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-black bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-rose-500/30 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 inline-block mb-3">
              Application Rejected
            </span>
            <h1 className="text-2xl font-black text-black mb-2">Registration Not Approved</h1>
            {(merchant?.rejectionReason || merchant?.error) && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 mb-4 text-left">
                <span className="text-[11px] font-bold text-rose-300 block mb-1">Reason:</span>
                <p className="text-xs text-rose-200">{merchant?.rejectionReason || merchant?.error}</p>
              </div>
            )}
            <p className="text-gray-700 text-sm mb-6">
              Your merchant registration was not approved. You can submit a new registration or contact support.
            </p>
            <Link
              href="/merchant/register"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors block text-center"
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
      <div className="min-h-screen bg-white text-black flex flex-col font-sans relative">
        <header className="border-b border-gray-200 bg-white/80 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-black">
            <ArrowLeft className="w-4 h-4" />
            <span>Tirf Market</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-black bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-rose-500/30 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 inline-block mb-3">
              Account Suspended
            </span>
            <h1 className="text-2xl font-black text-black mb-2">Account Suspended</h1>
            {(merchant?.rejectionReason || merchant?.error) && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 mb-4 text-left">
                <span className="text-[11px] font-bold text-rose-300 block mb-1">Notice:</span>
                <p className="text-xs text-rose-200">{merchant?.rejectionReason || merchant?.error}</p>
              </div>
            )}
            <p className="text-gray-700 text-sm mb-6">
              This merchant account is suspended. Please contact TirfMarket support to resolve this issue.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans pb-20 selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Ambient Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[340px] bg-gradient-to-b from-emerald-600/10 via-emerald-900/5 to-transparent blur-[140px] rounded-full pointer-events-none -z-10" />

      {/* Top Projector & Counter Header */}
      <header className="border-b border-gray-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Left Brand & Shop Name */}
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="p-2 text-gray-700 hover:text-black rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all"
              title="Return to Public Marketplace"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-600/25 border border-emerald-400/30">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-base sm:text-lg tracking-tight text-black">
                    {effectiveShopName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-700">
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Counter
                  </span>
                  <span>·</span>
                  <span className="capitalize">{effectiveCategory}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Heartbeat & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-900 bg-white/90 px-3.5 py-1.5 rounded-xl border border-gray-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Counter Feed: <strong className="text-emerald-600 font-mono">Real-time (15s)</strong></span>
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-black bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('dashboard.logout')}</span>
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Quick Link to Marketplace */}
            <Link
              href="/"
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-black text-xs font-bold rounded-xl border border-gray-200/80 shadow-xs transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Marketplace</span>
            </Link>

            {/* Edit Shop Profile */}
            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="px-3 sm:px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Edit Profile</span>
            </button>

            {/* Post Deal Button */}
            <button
              type="button"
              onClick={() => setIsPostDealOpen((prev) => !prev)}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isPostDealOpen ? 'Close' : 'Post Deal'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-1 w-full space-y-8">
        {/* Pending Profile Update Alert Banner */}
        {pendingProfileUpdate && !profileUpdateBannerDismissed && (
          <div className="bg-amber-50 border border-amber-200/90 text-amber-950 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-black">Shop Profile Edit Under Review</span>
                  <span className="text-[10px] font-mono font-bold bg-amber-200/60 text-amber-800 uppercase px-2 py-0.5 rounded-full">
                    Pending Admin Approval
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Proposed changes to &ldquo;{pendingProfileUpdate.proposedShopName}&rdquo; were submitted on {new Date(pendingProfileUpdate.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}. Changes will reflect across customer marketplace once verified by compliance.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleOpenEditProfile}
                className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                View / Edit
              </button>
              <button
                type="button"
                onClick={() => setProfileUpdateBannerDismissed(true)}
                className="px-2.5 py-1.5 text-amber-700 hover:text-black text-xs font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Shop Profile Panel */}
        {merchant && (
          <div className="bg-gradient-to-b bg-white border border-gray-200/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl transition-all">
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-expanded={isProfileOpen}
              aria-controls="shop-profile-panel"
              className="w-full px-5 py-3.5 min-h-[44px] flex items-center justify-between text-left hover:bg-white/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-black group-hover:text-emerald-600 transition-colors">
                    {effectiveShopName}
                  </span>
                  {pendingProfileUpdate && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                      Edit Pending Approval
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  currentStatus === 'approved'
                    ? 'bg-white text-emerald-600 border-emerald-500/30'
                    : currentStatus === 'pending'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {currentStatus}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-700 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isProfileOpen && (
              <div id="shop-profile-panel" className="px-5 pb-5 pt-3 border-t border-gray-200/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm animate-fade-in">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                    {t('register.shopName') || 'Shop Name'}
                  </div>
                  <div className="font-bold text-black text-base">
                    {effectiveShopName}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{effectiveCategory}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                    Location & Contact
                  </div>
                  <div className="font-medium text-black text-xs line-clamp-1">
                    {effectiveAddress}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{effectivePhone}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                    Business Tax & Till
                  </div>
                  <div className="text-xs text-gray-600">
                    TIN: <span className="font-mono font-bold text-black">{effectiveTin}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Till #: <span className="font-mono font-bold text-black">{effectiveTill}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                    Profile Actions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleOpenEditProfile}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold border border-gray-200 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Edit Shop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordModalError(null);
                        setPasswordModalSuccess(null);
                        setNewPasswordInput('');
                        setConfirmPasswordInput('');
                        setIsPasswordModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{hasMerchantPassword(merchant.email || emailInput) ? 'Change Password' : 'Set Password'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tip Banner: Prompt to set password if merchant hasn't set one yet */}
        {merchant?.email && !hasMerchantPassword(merchant.email) && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Set your merchant password:</strong> Sign in faster without waiting for email verification codes.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPasswordModalError(null);
                setPasswordModalSuccess(null);
                setNewPasswordInput('');
                setConfirmPasswordInput('');
                setIsPasswordModalOpen(true);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-colors shadow-xs"
            >
              Set Password
            </button>
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
        <div className="bg-white border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[90px] rounded-full pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-black flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/25 border border-emerald-400/30">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-black tracking-tight flex items-center gap-2">
                      {t('dashboard.redeemTitle')}
                    </h2>
                    <p className="text-xs md:text-sm text-gray-700">
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
                    className="w-full bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 rounded-2xl px-5 py-4 text-xl sm:text-2xl md:text-3xl font-mono tracking-wider md:tracking-widest text-emerald-700 placeholder:font-sans placeholder:text-sm sm:placeholder:text-base placeholder:tracking-normal placeholder:text-gray-500 uppercase transition-all min-h-[58px]"
                  />
                  {redeemCodeInput && (
                    <button
                      type="button"
                      onClick={() => setRedeemCodeInput('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black p-1"
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

              {/* HTTP 409: Already Used Banner */}
              {redeemResult?.kind === 'already_used' && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 sm:p-5 rounded-2xl text-xs sm:text-sm flex items-start justify-between gap-3 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-200 block text-sm">{redeemResult.message}</span>
                      <p className="text-xs text-amber-300/80 mt-1">
                        Redeemed at: <strong className="text-black font-mono">{formatRedeemedAt(redeemResult.redeemedAt)}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRedeemResult(null)}
                    className="text-amber-400 hover:text-amber-200 text-xs font-semibold px-2 py-1 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* HTTP 404: Code Not Found Banner */}
              {redeemResult?.kind === 'not_found' && (
                <div className="mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span className="font-semibold">{redeemResult.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRedeemResult(null)}
                    className="text-rose-400 hover:text-rose-200 text-xs font-semibold px-2 py-1 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Other Failures: Generic Error Banner */}
              {redeemResult?.kind === 'error' && (
                <div className="mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span className="font-semibold">{redeemResult.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRedeemResult(null)}
                    className="text-rose-400 hover:text-rose-200 text-xs font-semibold px-2 py-1 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* HTTP 20x Success Card */}
              {redeemResult?.kind === 'success' && (
                <div className="mt-5 bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-500/50 text-emerald-200 p-6 sm:p-7 rounded-3xl shadow-2xl shadow-emerald-950/40 animate-fade-in relative">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/20 text-emerald-700 rounded-2xl border border-emerald-500/30 shadow-inner">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-emerald-700">
                          {t('dashboard.redeemSuccess')}
                        </h3>
                        <p className="text-xs text-emerald-600/80">
                          {t('dashboard.redeemedAt') || 'Redeemed at'}: <strong className="text-black font-mono">{formatRedeemedAt(redeemResult.redeemedAt)}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRedeemResult(null)}
                      className="px-3 py-1.5 bg-white hover:bg-white text-gray-900 hover:text-black rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Redeem Next Voucher
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-600/80 uppercase tracking-wider mb-1">
                        Deal Title
                      </div>
                      <div className="text-lg sm:text-xl font-black text-black leading-tight">
                        {redeemResult.dealTitle}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-emerald-600/80 uppercase tracking-wider mb-1">
                        Amount Paid (Cashless)
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">
                        {redeemResult.amount !== DASH ? (
                          <>
                            {redeemResult.amount} <span className="text-base font-bold text-emerald-700">ETB</span>
                          </>
                        ) : (
                          <span className="text-gray-700 font-mono">{DASH}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-600/70 font-semibold mt-1">
                        ✓ Settled via Safaricom M-PESA
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-emerald-600/80 uppercase tracking-wider mb-1">
                        Order Reference
                      </div>
                      <div className="text-xs sm:text-sm font-mono text-gray-900 break-all bg-white/60 p-2.5 rounded-xl border border-gray-200 flex items-center justify-between gap-2">
                        <span>{redeemResult.id}</span>
                        {redeemResult.id !== DASH && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(String(redeemResult.id));
                              setCopiedOrderId(true);
                              setTimeout(() => setCopiedOrderId(false), 2000);
                            }}
                            className="text-gray-700 hover:text-black p-1"
                            title="Copy Order ID"
                          >
                            {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
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
              <div className="bg-white border border-emerald-500/30 text-emerald-700 p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{postSuccessMessage}</span>
              </div>
            )}

            {/* Post Deal Section (Live POST /api/merchant/deals) */}
            {isPostDealOpen && (
              <div className="bg-white border-2 border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-black">Post New Deal</h3>
                      <p className="text-xs text-gray-700">
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
                    className="text-xs text-gray-700 hover:text-black px-2.5 py-1 rounded-lg bg-white hover:bg-white transition-colors cursor-pointer"
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
                      <label className="block text-xs font-bold text-gray-900 mb-1.5">
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
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-black placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-900 mb-1.5">
                          Price (ETB) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100000}
                          required
                          value={postPrice}
                          onChange={(e) => setPostPrice(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono text-black focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-900 mb-1.5">
                          Discount ({postDiscountPct}%) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          required
                          value={postDiscountPct}
                          onChange={(e) => setPostDiscountPct(Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono text-emerald-600 focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-[10px] text-gray-700 block mt-0.5">New shops: max 50%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-200/80">
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Expiry Duration (Days) *</span>
                      </label>
                      <select
                        value={postExpiryDays}
                        onChange={(e) => setPostExpiryDays(parseInt(e.target.value))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-black focus:outline-none focus:border-emerald-500"
                      >
                        <option value={1}>1 Day</option>
                        <option value={3}>3 Days</option>
                        <option value={5}>5 Days</option>
                        <option value={7}>7 Days (New shop maximum)</option>
                        <option value={14}>14 Days</option>
                        <option value={30}>30 Days</option>
                      </select>
                      <span className="text-[10px] text-gray-700 block mt-0.5">New shops: up to 7 days only</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-1.5">
                        Item / Stock Code (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={postItemCode}
                        onChange={(e) => setPostItemCode(e.target.value.toUpperCase())}
                        placeholder="e.g. COFFEE-01"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase text-black placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-gray-700 block mt-0.5">3-20 letters/digits/dashes</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white/80 rounded-xl border border-gray-200 flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-700">Final customer counter price:</span>
                    <span className="text-emerald-600 font-black text-sm">
                      {Math.round(postPrice * (1 - postDiscountPct / 100))} ETB
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={postLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
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
            <div className="bg-white/80 border border-gray-200/80 rounded-3xl overflow-hidden backdrop-blur-md shadow-xl">
              <div className="p-5 md:p-6 border-b border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-black text-base md:text-lg flex items-center gap-2">
                      <span>Active Shop Deals</span>
                    </h3>
                    <p className="text-xs text-gray-700 mt-0.5">
                      Live published offers shown to shoppers within 2 km
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPostDealOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600/30 text-emerald-700 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Deal</span>
                </button>
              </div>

              {/* Deal Performance & Revenue Banner */}
              <div className="bg-emerald-50/80 border-b border-emerald-100/80 px-5 md:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
                  <div>
                    <span className="text-gray-500 uppercase tracking-wider text-[10px] font-bold block">
                      Total Deal Earnings
                    </span>
                    <span className="text-base sm:text-lg font-black text-emerald-800 font-mono">
                      {totalEarnedAmount.toLocaleString()} <span className="text-xs font-bold">ETB</span>
                    </span>
                  </div>
                  <div className="border-l border-emerald-200/80 pl-6 sm:pl-8">
                    <span className="text-gray-500 uppercase tracking-wider text-[10px] font-bold block">
                      Total Vouchers Claimed
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                      {totalDealsClaimedCount} <span className="text-xs font-bold text-gray-600">claims</span>
                    </span>
                  </div>
                  <div className="border-l border-emerald-200/80 pl-6 sm:pl-8 hidden md:block">
                    <span className="text-gray-500 uppercase tracking-wider text-[10px] font-bold block">
                      Active Offers Live
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-800 font-mono">
                      {enrichedDeals.filter((d) => d.isActive).length} / {enrichedDeals.length}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-emerald-800 font-medium bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Settles directly to your Safaricom M-PESA merchant till</span>
                </div>
              </div>

              {dealsLoading ? (
                <div className="py-12 text-center text-gray-600 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <p className="text-xs">Loading active deals...</p>
                </div>
              ) : enrichedDeals.length === 0 ? (
                <div className="py-12 text-center text-gray-600 text-xs">
                  No active deals posted yet. Click &quot;Post Deal&quot; to publish your first offer.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-white/70 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200/80">
                      <tr>
                        <th className="px-6 py-3.5">Deal</th>
                        <th className="px-6 py-3.5 text-right">Original Price</th>
                        <th className="px-6 py-3.5 text-center">Discount</th>
                        <th className="px-6 py-3.5 text-right">Counter Price</th>
                        <th className="px-6 py-3.5 text-center">Claimed</th>
                        <th className="px-6 py-3.5 text-right">Earned</th>
                        <th className="px-6 py-3.5">Expires</th>
                        <th className="px-6 py-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-mono text-xs">
                      {enrichedDeals.map((d) => (
                        <tr key={d.id} className="hover:bg-white/30 transition-colors">
                          <td className="px-6 py-3.5 font-bold font-sans text-black max-w-xs truncate">
                            <div>{d.title}</div>
                            {d.itemCode && (
                              <span className="text-[10px] text-gray-700 font-mono">Code: {d.itemCode}</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right text-gray-700 line-through">
                            {d.price} ETB
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <span className="px-2 py-0.5 rounded font-black bg-emerald-500/20 text-emerald-700">
                              {d.discountPct}% OFF
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right font-black text-amber-500">
                            {d.finalAmount} ETB
                          </td>
                          <td className="px-6 py-3.5 text-center font-sans">
                            {(d.claimedCount || 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
                                🔥 {d.claimedCount} claimed
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs font-medium">0 claimed</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono">
                            {(d.earnedAmount || 0) > 0 ? (
                              <span className="text-xs sm:text-sm font-black text-emerald-700">
                                {(d.earnedAmount || 0).toLocaleString()} ETB
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">0 ETB</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-gray-900 font-sans text-xs">
                            {formatDate(d.expiryDate)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-sans">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              d.isActive
                                ? 'text-emerald-600 bg-white border border-emerald-500/30'
                                : 'text-gray-700 bg-white border border-gray-200'
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
              {/* Deals Claimed */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <div className="flex items-center justify-between text-gray-700 mb-3">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700">
                    {t('dashboard.dealsClaimed') || 'Total Deals Claimed'}
                  </span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-emerald-600 font-mono tracking-tight">
                  {animatedDealsRedeemed}
                </div>
                <div className="text-[11px] text-gray-600 font-medium mt-2 flex items-center justify-between flex-wrap gap-1">
                  <span>Counter-verified vouchers</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">✓ M-PESA Paid</span>
                </div>
              </div>

              {/* Cashless Sales / Total Earned */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
                <div className="flex items-center justify-between text-gray-700 mb-3">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700">
                    {t('dashboard.totalEarned') || 'Total Earned'}
                  </span>
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-amber-500 font-mono tracking-tight truncate">
                  {animatedSales.toLocaleString()} <span className="text-lg sm:text-xl font-bold">ETB</span>
                </div>
                <div className="text-[11px] text-gray-600 font-medium mt-2 flex items-center justify-between flex-wrap gap-1">
                  <span>Cleared to merchant till</span>
                  {animatedDealsRedeemed > 0 && (
                    <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                      Avg. {(animatedSales / Math.max(1, animatedDealsRedeemed)).toFixed(0)} ETB / claim
                    </span>
                  )}
                </div>
              </div>

              {/* Pending Orders */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-sky-500/40 transition-all">
                <div className="flex items-center justify-between text-gray-700 mb-3">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700">
                    {t('dashboard.pending')}
                  </span>
                  <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-sky-400 font-mono tracking-tight">
                  {animatedPending}
                </div>
                <div className="text-[11px] text-gray-600 font-medium mt-2">
                  Awaiting PIN STK on customer handset
                </div>
              </div>

              {/* Failed Orders */}
              <div className="bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-rose-500/40 transition-all">
                <div className="flex items-center justify-between text-gray-700 mb-3">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700">
                    {t('dashboard.failed')}
                  </span>
                  <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-rose-400 font-mono tracking-tight">
                  {animatedFailed}
                </div>
                <div className="text-[11px] text-gray-600 font-medium mt-2">
                  Declined or cancelled PIN requests
                </div>
              </div>
            </div>

            {/* Live Orders Stream List */}
            <div className="bg-gradient-to-b bg-white border border-gray-200/80 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-black flex items-center gap-2">
                      <span>{t('dashboard.recentOrders')}</span>
                    </h2>
                    <p className="text-xs text-gray-700">
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
                      className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-black placeholder-gray-500 focus:outline-none focus:border-emerald-500 min-h-[36px]"
                    />
                    <Search className="w-3.5 h-3.5 text-gray-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="hidden sm:flex items-center gap-2 text-xs text-gray-700 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Live Stream</span>
                  </div>
                </div>
              </div>

              {loading && !stats ? (
                <div className="py-20 text-center text-gray-600 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-xs sm:text-sm">Loading transactions...</p>
                </div>
              ) : !stats?.recent || stats.recent.length === 0 ? (
                <div className="py-16 text-center text-gray-600 text-xs sm:text-sm">
                  {t('dashboard.noRecentOrders')}
                </div>
              ) : filteredRecentOrders.length === 0 ? (
                <div className="py-12 text-center text-gray-600 text-xs">
                  No orders match &quot;{orderSearchQuery}&quot;.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-white/70 text-gray-700 text-xs uppercase font-semibold border-b border-gray-200/80">
                      <tr>
                        <th className="px-6 py-4">{t('dashboard.deal')}</th>
                        <th className="px-6 py-4 text-right">{t('dashboard.amount')}</th>
                        <th className="px-6 py-4">{t('dashboard.receipt')}</th>
                        <th className="px-6 py-4">{t('dashboard.paidAt')}</th>
                        <th className="px-6 py-4 font-mono text-gray-600">{t('dashboard.orderId')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredRecentOrders.map((order: DashboardOrder) => (
                        <tr key={order.orderId} className="hover:bg-white/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-black max-w-xs truncate">
                            {order.dealTitle || 'Deal'}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                            {order.amount.toLocaleString()} ETB
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-emerald-600">
                            {order.receipt ? (
                              <span className="inline-flex items-center gap-1 bg-white border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                {order.receipt}
                              </span>
                            ) : (
                              <span className="text-gray-700">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-700 text-xs whitespace-nowrap">
                            {formatTime(order.paidAt)}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-gray-600 whitespace-nowrap">
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

      {/* Password Management Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-md p-6 sm:p-8 relative">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-black">
                {hasMerchantPassword(merchant?.email || emailInput) ? 'Change Merchant Password' : 'Set Merchant Password'}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                You can use this password to sign in to your dashboard instantly without email OTP codes.
              </p>
            </div>

            {passwordModalError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordModalError}</span>
              </div>
            )}

            {passwordModalSuccess && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wider mb-1.5">
                  New Password (min 6 chars)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-black text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 pl-4 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-900 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-black text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:text-black font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordModalLoading || newPasswordInput.length < 6}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {passwordModalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Save Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merchant Edit Profile Modal (Requires Admin Approval) */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-black">Edit Shop Profile</h3>
                  <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 uppercase px-2 py-0.5 rounded-full border border-amber-200">
                    Admin Approval Required
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Updates to shop name, category, tax TIN, and map location will be queued for compliance review before reflecting on the public marketplace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-black flex items-center justify-center transition-colors cursor-pointer shrink-0 font-bold"
              >
                ✕
              </button>
            </div>

            {editErrorMsg && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editErrorMsg}</span>
              </div>
            )}

            {editSuccessMsg && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitProfileEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editShopName}
                    onChange={(e) => setEditShopName(e.target.value)}
                    placeholder="e.g. Bole Highland Cafe"
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Category *
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  >
                    <option value="Café">Café</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Juice">Juice Bar</option>
                    <option value="Books">Books & Stationery</option>
                    <option value="Barber">Barbershop & Grooming</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Other">Other Retail</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editContactPhone}
                    onChange={(e) => setEditContactPhone(e.target.value)}
                    placeholder="+251 791 234567"
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    M-PESA Till # (Optional)
                  </label>
                  <input
                    type="text"
                    value={editTillNumber}
                    onChange={(e) => setEditTillNumber(e.target.value)}
                    placeholder="e.g. 884920"
                    className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Business TIN Number *
                </label>
                <input
                  type="text"
                  required
                  value={editTinNumber}
                  onChange={(e) => setEditTinNumber(e.target.value)}
                  placeholder="10-digit TIN e.g. 0019283746"
                  className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Shop Address in Bole *
                </label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="e.g. Bole Medhanialem, Behind Edna Mall, 2nd Floor"
                  className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                />
              </div>

              {/* Map Location Pin Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-800">
                    Tap to Pin Store Location on Bole Map *
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono">
                    Pin X: {editPinLocation.x}% · Y: {editPinLocation.y}%
                  </span>
                </div>
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                    setEditPinLocation({ x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) });
                  }}
                  className="relative w-full h-36 bg-slate-100 rounded-2xl border border-gray-300 overflow-hidden cursor-crosshair shadow-inner"
                >
                  <div className="absolute inset-0 bg-[#eef2ef] flex items-center justify-center">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center px-4">
                      Bole Interactive Neighborhood Grid · Tap anywhere to set storefront pin
                    </span>
                  </div>
                  <div
                    className="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none transition-all duration-150"
                    style={{ left: `${editPinLocation.x}%`, top: `${editPinLocation.y}%` }}
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white text-white flex items-center justify-center shadow-lg">
                      <MapPin className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Storefront Description & Highlights
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Describe your specialty items, opening hours, or popular dishes for nearby customers..."
                  className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-normal"
                />
              </div>

              <div className="bg-amber-50/70 border border-amber-200 text-amber-900 rounded-xl p-3 text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Admin Moderation Policy:</strong> Submissions are reviewed within 24 hours. Your current store profile will remain live until an administrator approves your edits.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:text-black font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting || !editShopName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Submit for Admin Approval</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
