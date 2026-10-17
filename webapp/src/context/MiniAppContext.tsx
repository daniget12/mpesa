'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { 
  Shop, 
  Deal, 
  Claim, 
  MerchantSaleRecord, 
  Language, 
  UserRole,
  ReportedDeal 
} from '../types/miniapp';
import { 
  INITIAL_SHOPS, 
  INITIAL_DEALS, 
  INITIAL_MERCHANT_SALES, 
  INITIAL_PAST_CLAIMS,
  calculateFinalPrice,
  generateRedemptionCode,
  generateReceiptNumber,
  TRANSLATIONS 
} from '../mockData/miniapp';

export interface MiniAppContextType {
  // Roles & Navigation
  role: UserRole;
  setRole: (role: UserRole) => void;
  customerTab: 'deals' | 'claims';
  setCustomerTab: (tab: 'deals' | 'claims') => void;
  selectedDeal: Deal | null;
  setSelectedDeal: (deal: Deal | null) => void;
  activeView: 'list' | 'map';
  setActiveView: (view: 'list' | 'map') => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof TRANSLATIONS.en;

  // Data
  shops: Shop[];
  deals: Deal[];
  claims: Claim[];
  merchantSales: MerchantSaleRecord[];
  reportedDeals: ReportedDeal[];
  
  // Active Customer Claim Workflow
  activeClaim: Claim | null;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  stkModalOpen: boolean;
  setStkModalOpen: (open: boolean) => void;
  startClaimReservation: (deal: Deal) => { success: boolean; reason?: 'too_many' | 'sold_out' };
  cancelReservation: () => void;
  submitMpesaPayment: (pin: string) => Promise<{ success: boolean; error?: string }>;
  
  // Real-time Timers
  reservationSecondsLeft: number;
  pickupSecondsLeft: number;
  fastForwardReservation: () => void;
  fastForwardPickup: () => void;

  // Demo Controls
  demoState: string | null;
  triggerDemoState: (stateName: string) => void;
  resetAllDemoData: () => void;

  // Merchant actions
  currentMerchantShopId: string;
  setCurrentMerchantShopId: (id: string) => void;
  currentMerchantShop: Shop;
  redeemVoucherCode: (code: string) => { 
    success: boolean; 
    status: 'redeemed' | 'already_used' | 'expired' | 'not_found'; 
    sale?: MerchantSaleRecord;
    message: string;
  };
  postNewDeal: (newDeal: Omit<Deal, 'id' | 'createdAt' | 'reportCount' | 'isHidden' | 'themeColor' | 'finalPrice'>) => void;
  endDeal: (dealId: string) => void;
  registerNewShop: (shopData: Partial<Shop>) => void;

  // Admin actions
  verifyShopOnEtrade: (shopId: string, checked: boolean) => void;
  approveShop: (shopId: string) => void;
  rejectShop: (shopId: string) => void;
  completeRefund: (claimId: string) => void;
  reportDeal: (dealId: string, reason: string) => void;
}

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

export const MiniAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('customer');
  const [customerTab, setCustomerTab] = useState<'deals' | 'claims'>('deals');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'map'>('list');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [language, setLanguage] = useState<Language>('en');

  // Core Data
  const [shops, setShops] = useState<Shop[]>(INITIAL_SHOPS);
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [claims, setClaims] = useState<Claim[]>(INITIAL_PAST_CLAIMS);
  const [merchantSales, setMerchantSales] = useState<MerchantSaleRecord[]>(INITIAL_MERCHANT_SALES);
  const [reportedDeals, setReportedDeals] = useState<ReportedDeal[]>([]);

  // Active Flow State
  const [activeClaim, setActiveClaim] = useState<Claim | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string>('251700404709');
  const [stkModalOpen, setStkModalOpen] = useState<boolean>(false);
  const [demoState, setDemoState] = useState<string | null>(null);

  // Merchant ID currently active in merchant view
  const [currentMerchantShopId, setCurrentMerchantShopId] = useState<string>('shop-sunrise');

  const currentMerchantShop = useMemo(() => {
    return shops.find(s => s.id === currentMerchantShopId) || shops[0];
  }, [shops, currentMerchantShopId]);

  // Reservation countdown (5 minutes = 300 seconds)
  const [reservationSecondsLeft, setReservationSecondsLeft] = useState<number>(300);
  // Pickup window countdown
  const [pickupSecondsLeft, setPickupSecondsLeft] = useState<number>(38 * 60);

  // Translation lookup
  const t = useMemo(() => TRANSLATIONS[language], [language]);

  const expireHold = useCallback((claimId: string) => {
    setActiveClaim(prev => {
      if (!prev || prev.id !== claimId) return prev;
      return { ...prev, status: 'expired_hold' };
    });
    // Release unit back to deal
    setDeals(prev => prev.map(d => {
      if (activeClaim && d.id === activeClaim.dealId) {
        return { ...d, unitsLeft: Math.min(d.unitsTotal, d.unitsLeft + 1) };
      }
      return d;
    }));
    setDemoState('expired_hold');
  }, [activeClaim]);

  const expirePickupWindow = useCallback((claimId: string) => {
    setActiveClaim(prev => {
      if (!prev || prev.id !== claimId) return prev;
      return { ...prev, status: 'expired_pickup' };
    });
    setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: 'expired_pickup' } : c));
    setMerchantSales(prev => prev.map(s => {
      if (activeClaim && s.redemptionCode === activeClaim.redemptionCode) {
        return { ...s, status: 'expired_refund_due' };
      }
      return s;
    }));
    setDemoState('expired_pickup');
  }, [activeClaim]);

  // Reservation timer tick
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (activeClaim && activeClaim.status === 'reserved') {
      interval = setInterval(() => {
        setReservationSecondsLeft(prev => {
          if (prev <= 1) {
            expireHold(activeClaim.id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeClaim, expireHold]);

  // Pickup timer tick
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (activeClaim && activeClaim.status === 'paid') {
      interval = setInterval(() => {
        setPickupSecondsLeft(prev => {
          if (prev <= 1) {
            expirePickupWindow(activeClaim.id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeClaim, expirePickupWindow]);

  const startClaimReservation = (deal: Deal): { success: boolean; reason?: 'too_many' | 'sold_out' } => {
    // Check rule 1: Sold out
    if (deal.unitsLeft <= 0) {
      setDemoState('sold_out');
      return { success: false, reason: 'sold_out' };
    }

    // Check rule 2: Max 2 active claims per customer
    const activeClaimsCount = claims.filter(c => c.status === 'reserved' || c.status === 'paid').length;
    if (activeClaimsCount >= 2) {
      setDemoState('too_many_claims');
      return { success: false, reason: 'too_many' };
    }

    // Hold 1 unit
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, unitsLeft: Math.max(0, d.unitsLeft - 1) } : d));

    const newClaim: Claim = {
      id: `claim-${Date.now()}`,
      dealId: deal.id,
      shopId: deal.shopId,
      shopName: deal.shopName,
      dealTitle: deal.title,
      itemCode: deal.itemCode,
      originalPrice: deal.originalPrice,
      discountPct: deal.discountPct,
      finalPrice: deal.finalPrice,
      customerPhone: customerPhone,
      redemptionCode: generateRedemptionCode(),
      status: 'reserved',
      reservedAt: Date.now(),
      holdExpiresAt: Date.now() + 5 * 60 * 1000,
    };

    setActiveClaim(newClaim);
    setReservationSecondsLeft(300);
    setDemoState('reserved');
    return { success: true };
  };

  const cancelReservation = () => {
    if (activeClaim && (activeClaim.status === 'reserved' || activeClaim.status === 'paying')) {
      setDeals(prev => prev.map(d => d.id === activeClaim.dealId ? { ...d, unitsLeft: Math.min(d.unitsTotal, d.unitsLeft + 1) } : d));
    }
    setActiveClaim(null);
    setStkModalOpen(false);
    setDemoState(null);
  };

  const submitMpesaPayment = async (_pin: string): Promise<{ success: boolean; error?: string }> => {
    void _pin;
    if (!activeClaim) return { success: false, error: 'No active reservation' };

    // Failure simulation rule: Numbers ending in 0000 fail; 251700404709 succeeds
    const isFailurePhone = customerPhone.endsWith('0000');
    if (isFailurePhone) {
      setDeals(prev => prev.map(d => d.id === activeClaim.dealId ? { ...d, unitsLeft: Math.min(d.unitsTotal, d.unitsLeft + 1) } : d));
      setActiveClaim(prev => prev ? { ...prev, status: 'expired_hold' } : null);
      setStkModalOpen(false);
      setDemoState('payment_failed');
      setShops(prev => prev.map(s => s.id === activeClaim.shopId ? { ...s, failedSalesCount: s.failedSalesCount + 1 } : s));
      return { success: false, error: 'M-PESA transaction failed. Insufficient funds or invalid PIN.' };
    }

    const receipt = generateReceiptNumber();
    const paidTimestamp = Date.now();
    const matchingDeal = deals.find(d => d.id === activeClaim.dealId);
    const walkMin = matchingDeal?.walkMinutes || 5;
    const pickupDurationMinutes = Math.max(20, Math.min(120, walkMin + 15));
    const pickupExpiresAt = paidTimestamp + pickupDurationMinutes * 60 * 1000;

    const completedClaim: Claim = {
      ...activeClaim,
      status: 'paid',
      mpesaReceipt: receipt,
      paidAt: paidTimestamp,
      pickupExpiresAt: pickupExpiresAt,
      customerPhone: customerPhone,
    };

    setActiveClaim(completedClaim);
    setClaims(prev => [completedClaim, ...prev]);
    setPickupSecondsLeft(pickupDurationMinutes * 60);
    setStkModalOpen(false);
    setDemoState('paid');

    const newSaleRecord: MerchantSaleRecord = {
      id: `sale-${Date.now()}`,
      dealTitle: completedClaim.dealTitle,
      amount: completedClaim.finalPrice,
      mpesaReceipt: receipt,
      redemptionCode: completedClaim.redemptionCode,
      timestamp: paidTimestamp,
      status: 'paid',
    };

    setMerchantSales(prev => [newSaleRecord, ...prev]);

    setShops(prev => prev.map(s => {
      if (s.id === completedClaim.shopId) {
        return {
          ...s,
          cashlessSalesTotal: s.cashlessSalesTotal + completedClaim.finalPrice,
          pendingSalesCount: s.pendingSalesCount + 1,
        };
      }
      return s;
    }));

    return { success: true };
  };

  const fastForwardReservation = () => {
    setReservationSecondsLeft(10);
  };

  const fastForwardPickup = () => {
    setPickupSecondsLeft(5);
  };

  const triggerDemoState = (stateName: string) => {
    setDemoState(stateName);

    if (stateName === 'customer_home') {
      setRole('customer');
      setCustomerTab('deals');
      setSelectedDeal(null);
      setActiveClaim(null);
      setStkModalOpen(false);
    } else if (stateName === 'deal_detail') {
      setRole('customer');
      const sunriseDeal = deals.find(d => d.shopId === 'shop-sunrise') || deals[0];
      setSelectedDeal(sunriseDeal);
      setActiveClaim(null);
      setStkModalOpen(false);
    } else if (stateName === 'reserved') {
      setRole('customer');
      const sunriseDeal = deals.find(d => d.shopId === 'shop-sunrise') || deals[0];
      setSelectedDeal(sunriseDeal);
      startClaimReservation(sunriseDeal);
      setStkModalOpen(false);
    } else if (stateName === 'paying') {
      setRole('customer');
      const sunriseDeal = deals.find(d => d.shopId === 'shop-sunrise') || deals[0];
      setSelectedDeal(sunriseDeal);
      if (!activeClaim) {
        startClaimReservation(sunriseDeal);
      }
      setStkModalOpen(true);
    } else if (stateName === 'paid') {
      setRole('customer');
      const sunriseDeal = deals.find(d => d.shopId === 'shop-sunrise') || deals[0];
      setSelectedDeal(sunriseDeal);
      const mockPaidClaim: Claim = {
        id: `claim-demo-${Date.now()}`,
        dealId: sunriseDeal.id,
        shopId: sunriseDeal.shopId,
        shopName: sunriseDeal.shopName,
        dealTitle: sunriseDeal.title,
        itemCode: sunriseDeal.itemCode,
        originalPrice: sunriseDeal.originalPrice,
        discountPct: sunriseDeal.discountPct,
        finalPrice: sunriseDeal.finalPrice,
        customerPhone: '251700404709',
        redemptionCode: 'K7M4Q9XR',
        mpesaReceipt: 'NLJ7RT61SV',
        status: 'paid',
        reservedAt: Date.now() - 60000,
        holdExpiresAt: Date.now() + 240000,
        paidAt: Date.now(),
        pickupExpiresAt: Date.now() + 38 * 60 * 1000,
      };
      setActiveClaim(mockPaidClaim);
      setPickupSecondsLeft(38 * 60);
      setStkModalOpen(false);
    } else if (stateName === 'expired_hold') {
      setRole('customer');
      setDemoState('expired_hold');
      setActiveClaim(null);
    } else if (stateName === 'sold_out') {
      setRole('customer');
      setDemoState('sold_out');
      setActiveClaim(null);
    } else if (stateName === 'payment_failed') {
      setRole('customer');
      setDemoState('payment_failed');
      setStkModalOpen(false);
    } else if (stateName === 'expired_pickup') {
      setRole('customer');
      setDemoState('expired_pickup');
    } else if (stateName === 'too_many_claims') {
      setRole('customer');
      setDemoState('too_many_claims');
    } else if (stateName === 'my_claims') {
      setRole('customer');
      setCustomerTab('claims');
      setSelectedDeal(null);
    } else if (stateName === 'merchant_dashboard') {
      setRole('merchant');
      setCurrentMerchantShopId('shop-sunrise');
    } else if (stateName === 'admin_dashboard') {
      setRole('admin');
    }
  };

  const resetAllDemoData = () => {
    setShops(INITIAL_SHOPS);
    setDeals(INITIAL_DEALS);
    setClaims(INITIAL_PAST_CLAIMS);
    setMerchantSales(INITIAL_MERCHANT_SALES);
    setReportedDeals([]);
    setActiveClaim(null);
    setSelectedDeal(null);
    setStkModalOpen(false);
    setCustomerPhone('251700404709');
    setDemoState(null);
    setRole('customer');
    setCustomerTab('deals');
  };

  const redeemVoucherCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const claim = claims.find(c => c.redemptionCode === cleanCode);
    const sale = merchantSales.find(s => s.redemptionCode === cleanCode);

    if (!claim && !sale && cleanCode !== 'K7M4Q9XR') {
      return {
        success: false,
        status: 'not_found' as const,
        message: 'Redemption code not found. Please verify with customer.'
      };
    }

    const currentStatus = claim?.status || sale?.status || 'paid';

    if (currentStatus === 'redeemed') {
      return {
        success: false,
        status: 'already_used' as const,
        message: 'Code has already been redeemed.'
      };
    }

    if (currentStatus === 'expired_pickup') {
      return {
        success: false,
        status: 'expired' as const,
        message: 'Code is expired. A refund is queued for the customer.'
      };
    }

    if (claim) {
      setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: 'redeemed', redeemedAt: Date.now() } : c));
    }
    if (activeClaim && activeClaim.redemptionCode === cleanCode) {
      setActiveClaim(prev => prev ? { ...prev, status: 'redeemed', redeemedAt: Date.now() } : null);
    }

    setMerchantSales(prev => prev.map(s => s.redemptionCode === cleanCode ? { ...s, status: 'redeemed' } : s));

    setShops(prev => prev.map(s => {
      if (s.id === currentMerchantShopId) {
        return {
          ...s,
          dealsRedeemedCount: s.dealsRedeemedCount + 1,
          pendingSalesCount: Math.max(0, s.pendingSalesCount - 1)
        };
      }
      return s;
    }));

    return {
      success: true,
      status: 'redeemed' as const,
      sale: sale,
      message: 'Voucher verified and redeemed successfully! Cashless payment confirmed.'
    };
  };

  const postNewDeal = (newDealData: Omit<Deal, 'id' | 'createdAt' | 'reportCount' | 'isHidden' | 'themeColor' | 'finalPrice'>) => {
    const calculatedFinalPrice = calculateFinalPrice(newDealData.originalPrice, newDealData.discountPct);
    const newDeal: Deal = {
      ...newDealData,
      id: `deal-${Date.now()}`,
      finalPrice: calculatedFinalPrice,
      createdAt: Date.now(),
      reportCount: 0,
      isHidden: false,
      themeColor: '#059669',
    };
    setDeals(prev => [newDeal, ...prev]);
  };

  const endDeal = (dealId: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, unitsLeft: 0, isHidden: true } : d));
  };

  const registerNewShop = (shopData: Partial<Shop>) => {
    const newShop: Shop = {
      id: `shop-${Date.now()}`,
      name: shopData.name || 'New Shop',
      nameAm: shopData.nameAm || shopData.name || 'አዲስ ሱቅ',
      category: shopData.category || 'Café',
      categoryAm: shopData.categoryAm || 'ካፌ',
      isVerified: false,
      isNew: true,
      tinNumber: shopData.tinNumber || '0000000000',
      tillNumber: shopData.tillNumber,
      address: shopData.address || 'Bole, Addis Ababa',
      addressAm: shopData.addressAm || 'ቦሌ፣ አዲስ አበባ',
      distanceMeters: 650,
      walkMinutes: 8,
      mapCoords: { x: 55, y: 55 },
      approvalStatus: 'pending',
      eTradeVerified: false,
      dealsRedeemedCount: 0,
      cashlessSalesTotal: 0,
      pendingSalesCount: 0,
      failedSalesCount: 0,
    };
    setShops(prev => [...prev, newShop]);
    setCurrentMerchantShopId(newShop.id);
  };

  const verifyShopOnEtrade = (shopId: string, checked: boolean) => {
    setShops(prev => prev.map(s => s.id === shopId ? { ...s, eTradeVerified: checked } : s));
  };

  const approveShop = (shopId: string) => {
    setShops(prev => prev.map(s => s.id === shopId ? { ...s, approvalStatus: 'approved', isVerified: true } : s));
  };

  const rejectShop = (shopId: string) => {
    setShops(prev => prev.map(s => s.id === shopId ? { ...s, approvalStatus: 'rejected' } : s));
  };

  const completeRefund = (claimId: string) => {
    setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: 'refunded', refundedAt: Date.now() } : c));
    setMerchantSales(prev => prev.map(s => s.id === claimId ? { ...s, status: 'refunded' } : s));
  };

  const reportDeal = (dealId: string, reason: string) => {
    const reportedItem: ReportedDeal = {
      dealId,
      dealTitle: deals.find(d => d.id === dealId)?.title || 'Deal',
      shopName: deals.find(d => d.id === dealId)?.shopName || 'Shop',
      reason,
      reportedAt: Date.now(),
      reporterIpOrId: `shopper-${Math.floor(Math.random() * 1000)}`
    };
    setReportedDeals(prev => [reportedItem, ...prev]);

    setDeals(prev => prev.map(d => {
      if (d.id === dealId) {
        const nextReportCount = d.reportCount + 1;
        return {
          ...d,
          reportCount: nextReportCount,
          isHidden: nextReportCount >= 3 ? true : d.isHidden,
        };
      }
      return d;
    }));
  };

  return (
    <MiniAppContext.Provider
      value={{
        role,
        setRole,
        customerTab,
        setCustomerTab,
        selectedDeal,
        setSelectedDeal,
        activeView,
        setActiveView,
        selectedCategory,
        setSelectedCategory,
        language,
        setLanguage,
        t,
        shops,
        deals,
        claims,
        merchantSales,
        reportedDeals,
        activeClaim,
        customerPhone,
        setCustomerPhone,
        stkModalOpen,
        setStkModalOpen,
        startClaimReservation,
        cancelReservation,
        submitMpesaPayment,
        reservationSecondsLeft,
        pickupSecondsLeft,
        fastForwardReservation,
        fastForwardPickup,
        demoState,
        triggerDemoState,
        resetAllDemoData,
        currentMerchantShopId,
        setCurrentMerchantShopId,
        currentMerchantShop,
        redeemVoucherCode,
        postNewDeal,
        endDeal,
        registerNewShop,
        verifyShopOnEtrade,
        approveShop,
        rejectShop,
        completeRefund,
        reportDeal,
      }}
    >
      {children}
    </MiniAppContext.Provider>
  );
};

export const useMiniApp = () => {
  const context = useContext(MiniAppContext);
  if (!context) {
    throw new Error('useMiniApp must be used within a MiniAppProvider');
  }
  return context;
};

// Convenient alias matching mpesa2's useApp
export const useApp = useMiniApp;
