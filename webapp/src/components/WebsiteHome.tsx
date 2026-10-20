'use client';

import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import DealCard from '@/components/DealCard';
import MpesaModal from '@/components/MpesaModal';
import DealDetailsModal from '@/components/DealDetailsModal';
import MerchantDetailModal from '@/components/MerchantDetailModal';
import { ShopsMap } from '@/components/ShopsMap';
import { QrCodeSvg } from '@/components/common/QrCodeSvg';
import {
  Utensils,
  Coffee,
  Store,
  Pill,
  Scissors,
  MapPin,
  Navigation,
  Sliders,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Footprints,
  Copy,
  Map,
  List,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { fetchNearbyDeals, NearbyDeal } from '@/lib/api';
import { INITIAL_SHOPS, INITIAL_DEALS, calculateFinalPrice } from '@/mockData/miniapp';
import {
  checkAndExpireClaims,
  CustomerClaimTicket,
} from '@/lib/claimsStorage';
import { notifyCustomerNewDealNearby } from '@/lib/notifications';

const DEFAULT_LAT = 9.0000;
const DEFAULT_LON = 38.7800;



function getFallbackNearbyDeals(centerLat: number, centerLon: number): NearbyDeal[] {
  return INITIAL_DEALS.map((deal, idx) => {
    const shop = INITIAL_SHOPS.find((s) => s.id === deal.shopId) || INITIAL_SHOPS[0];
    const cat = (shop.category || 'cafe').toLowerCase();
    const finalAmount = calculateFinalPrice(deal.originalPrice, deal.discountPct);
    const dist = Math.round(shop.distanceMeters + (idx * 140) % 850);

    return {
      dealId: deal.id,
      title: deal.title,
      description: deal.description,
      category: cat,
      price: deal.originalPrice,
      discountPct: deal.discountPct,
      finalAmount: finalAmount,
      merchantId: shop.id,
      merchantName: shop.name,
      location: shop.address,
      lat: centerLat + ((idx % 3) - 1) * 0.003,
      lon: centerLon + (((idx + 1) % 3) - 1) * 0.003,
      distanceMeters: dist,
      verified: shop.isVerified,
      itemCode: deal.itemCode,
    };
  });
}

function subscribeNoop() {
  return () => {};
}

function getIsDemoSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('demo') === '1';
}

export const WebsiteHome: React.FC = () => {
  const { t, language } = useLanguage();
  const { user, isMerchant } = useAuth();
  const [selectedDealForDetails, setSelectedDealForDetails] = useState<NearbyDeal | null>(null);
  const [selectedDealForBuy, setSelectedDealForBuy] = useState<NearbyDeal | null>(null);
  const [selectedMerchantForModal, setSelectedMerchantForModal] = useState<string | null>(null);
  const [activeClaimTicket, setActiveClaimTicket] = useState<CustomerClaimTicket | null>(null);
  const [selectedTicketForPay, setSelectedTicketForPay] = useState<CustomerClaimTicket | null>(null);
  const [claimToast, setClaimToast] = useState<string | null>(null);
  const [copiedClaimCode, setCopiedClaimCode] = useState(false);
  const [claimCountdownSec, setClaimCountdownSec] = useState<number>(0);
  const [deals, setDeals] = useState<NearbyDeal[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const isDemoMode = useSyncExternalStore(subscribeNoop, getIsDemoSnapshot, () => false);

  // Dynamic categories built from loaded deals
  const dynamicCategories = useMemo(() => {
    const categorySet = new Set<string>();
    deals.forEach((deal) => {
      if (deal.category) {
        categorySet.add(deal.category.toLowerCase().trim());
      }
    });

    const categoryList = Array.from(categorySet).sort();
    return [
      { id: 'all', label: t('cat.all') || 'All Deals', icon: Sparkles },
      ...categoryList.map((cat) => {
        let icon = Store;
        if (cat.includes('cafe') || cat.includes('coffee')) icon = Coffee;
        else if (cat.includes('restaurant') || cat.includes('food')) icon = Utensils;
        else if (cat.includes('pharmacy')) icon = Pill;
        else if (cat.includes('barber') || cat.includes('salon')) icon = Scissors;

        const label = t(`cat.${cat}` as unknown as Parameters<typeof t>[0]) || (cat.charAt(0).toUpperCase() + cat.slice(1));
        return { id: cat, label, icon };
      }),
    ];
  }, [deals, t]);

  // Full Location State
  const [isLiveLocation, setIsLiveLocation] = useState(false);
  const [isSimulatedLocation, setIsSimulatedLocation] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [dismissedMerchantId, setDismissedMerchantId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'discount' | 'price'>('distance');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [radiusMeters, setRadiusMeters] = useState<number>(2000);

  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: DEFAULT_LAT,
    lon: DEFAULT_LON,
  });

  // Periodic auto-expiry engine check
  useEffect(() => {
    checkAndExpireClaims();
    const interval = setInterval(() => {
      checkAndExpireClaims();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Live countdown for active claimed ticket
  useEffect(() => {
    if (!activeClaimTicket?.holdExpiresAt) return;
    const update = () => {
      const exp = new Date(activeClaimTicket.holdExpiresAt!).getTime();
      const left = Math.max(0, Math.floor((exp - Date.now()) / 1000));
      setClaimCountdownSec(left);
      if (left <= 0) {
        checkAndExpireClaims();
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [activeClaimTicket]);

  const loadDeals = useCallback(async (lat: number, lon: number, radius?: number) => {
    setIsWakingUp(false);
    setLoading(true);
    setLoadError(null);
    const coldStartTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, 4000);

    try {
      const data = await fetchNearbyDeals(lat, lon, radius || radiusMeters);
      clearTimeout(coldStartTimer);
      if (Array.isArray(data) && data.length > 0) {
        setDeals(data);

        // Notify customer on the website that there is a new deal around them (strictly logged-in customers only)
        if (typeof window !== 'undefined' && user && !isMerchant) {
          try {
            const sessionKey = 'tirf_customer_notified_deal_ids';
            const notified: string[] = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');
            const closest = [...data].sort((a, b) => (a.distanceMeters || 9999) - (b.distanceMeters || 9999))[0];
            if (closest && !notified.includes(closest.dealId)) {
              notified.push(closest.dealId);
              sessionStorage.setItem(sessionKey, JSON.stringify(notified));
              setTimeout(() => {
                notifyCustomerNewDealNearby({
                  id: closest.dealId,
                  title: closest.title,
                  merchantName: closest.merchantName,
                  discountPct: closest.discountPct,
                  finalAmount: closest.finalAmount,
                  distanceMeters: closest.distanceMeters,
                });
              }, 1200);
            }
          } catch {}
        }
      } else {
        setDeals(getFallbackNearbyDeals(lat, lon));
      }
    } catch {
      clearTimeout(coldStartTimer);
      const fallbacks = getFallbackNearbyDeals(lat, lon);
      if (fallbacks.length > 0) {
        setDeals(fallbacks);
      } else {
        setLoadError('Failed to load deals');
      }
    } finally {
      setLoading(false);
      setIsWakingUp(false);
    }
  }, [radiusMeters, user, isMerchant]);

  // GPS User Location Detection
  const requestUserLocation = useCallback(() => {
    setIsSimulatedLocation(false);
    setDismissedMerchantId(null);
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setIsRequestingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsRequestingLocation(false);
          setIsLiveLocation(true);
          const userLat = pos.coords.latitude;
          const userLon = pos.coords.longitude;
          setCoords({ lat: userLat, lon: userLon });
          loadDeals(userLat, userLon);
        },
        () => {
          setIsRequestingLocation(false);
          setIsLiveLocation(false);
          setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
          loadDeals(DEFAULT_LAT, DEFAULT_LON);
        },
        { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
      );
    } else {
      setIsLiveLocation(false);
      setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
      loadDeals(DEFAULT_LAT, DEFAULT_LON);
    }
  }, [loadDeals]);

  // Simulate walking within 150m of nearest shop
  const handleWalkToShop = () => {
    if (deals.length === 0) return;
    const firstDeal = deals[0];
    const baseLat = typeof firstDeal.lat === 'number' ? firstDeal.lat : DEFAULT_LAT;
    const baseLon = typeof firstDeal.lon === 'number' ? firstDeal.lon : DEFAULT_LON;
    const simLat = baseLat + 0.00135;
    const simLon = baseLon;

    setIsSimulatedLocation(true);
    setIsLiveLocation(false);
    setDismissedMerchantId(null);
    setCoords({ lat: simLat, lon: simLon });
    loadDeals(simLat, simLon);
  };

  // Reset to Bole center
  const handleBackToBole = () => {
    setIsSimulatedLocation(false);
    setIsLiveLocation(false);
    setDismissedMerchantId(null);
    setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
    loadDeals(DEFAULT_LAT, DEFAULT_LON);
  };



  useEffect(() => {
    let ignore = false;
    const fetch = async () => {
      const coldStartTimer = setTimeout(() => {
        if (!ignore) setIsWakingUp(true);
      }, 4000);

      try {
        const data = await fetchNearbyDeals(coords.lat, coords.lon, radiusMeters);
        clearTimeout(coldStartTimer);
        if (!ignore) {
          if (Array.isArray(data) && data.length > 0) {
            setDeals(data);
          } else {
            setDeals(getFallbackNearbyDeals(coords.lat, coords.lon));
          }
        }
      } catch {
        clearTimeout(coldStartTimer);
        if (!ignore) setDeals(getFallbackNearbyDeals(coords.lat, coords.lon));
      } finally {
        if (!ignore) {
          setLoading(false);
          setIsWakingUp(false);
        }
      }
    };
    fetch();
    return () => {
      ignore = true;
    };
  }, [coords.lat, coords.lon, radiusMeters]);

  const filteredAndSortedDeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = deals.filter((d) => {
      const cat = (d.category || '').toLowerCase().trim();
      const matchesCategory = selectedCategory === 'all' || cat === selectedCategory;
      const matchesSearch =
        !q ||
        (d.title || '').toLowerCase().includes(q) ||
        (d.merchantName || '').toLowerCase().includes(q) ||
        (d.itemCode || '').toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'distance') {
        return (a.distanceMeters || 0) - (b.distanceMeters || 0);
      }
      if (sortBy === 'discount') {
        return (b.discountPct || 0) - (a.discountPct || 0);
      }
      return (a.finalAmount || 0) - (b.finalAmount || 0);
    });
  }, [deals, selectedCategory, searchQuery, sortBy]);

  // Proximity Alert computation: triggered when user is within 500m of a venue
  const nearestDeal = deals.length > 0 ? deals[0] : null;
  const isBannerVisible = Boolean(
    nearestDeal &&
    typeof nearestDeal.distanceMeters === 'number' &&
    nearestDeal.distanceMeters <= 500 &&
    nearestDeal.merchantId !== dismissedMerchantId
  );

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10">
        {/* Proximity Alert Banner (Interactive Hyperlocal Radar) */}
        {isBannerVisible && nearestDeal && (
          <aside aria-label="Proximity Alert" className="relative bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-2xl p-4 shadow-xl border border-emerald-700/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />

            <div
              onClick={() => setSelectedDealForDetails(nearestDeal)}
              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 relative z-10"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                <Navigation className="w-5 h-5 fill-slate-950" />
              </div>
              <div className="text-xs sm:text-sm font-medium truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                    {language === 'am' ? 'አቅራቢያዎ ያለ ቅናሽ' : 'Nearby Alert · 120 m'}
                  </span>
                </div>
                <div className="truncate font-bold text-white text-sm sm:text-base mt-0.5">
                  <span>{nearestDeal.merchantName}:</span>{' '}
                  <span>{nearestDeal.title}</span>
                </div>
                <div className="text-xs text-emerald-200 mt-0.5">
                  Final price: <span className="font-mono font-black text-amber-300">{nearestDeal.finalAmount} ETB</span> (was {nearestDeal.price} ETB)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end shrink-0 relative z-10">
              <button
                type="button"
                onClick={() => setSelectedDealForDetails(nearestDeal)}
                className="min-h-[40px] text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <span>{t('alert.view')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissedMerchantId(nearestDeal.merchantId);
                }}
                aria-label={t('alert.dismiss')}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </aside>
        )}

        {/* Restyled Hero: Calm white background, curved gradient shape echoing login panel, one clear promise, large pill button */}
        <section className="relative rounded-[32px] sm:rounded-[40px] bg-white border border-slate-100 shadow-soft-md p-6 sm:p-10 lg:p-14 overflow-hidden">
          {/* Large curved gradient shape echoing the login panel toggle */}
          <div
            aria-hidden="true"
            className="absolute -top-16 -right-16 sm:-top-20 sm:-right-20 w-72 h-72 sm:w-[460px] sm:h-[460px] lg:w-[560px] lg:h-[560px] rounded-[160px_40px_140px_80px] bg-gradient-to-br from-[#15803d] via-[#0d9488] to-[#2563eb] opacity-90 sm:opacity-95 shadow-soft-xl pointer-events-none transform rotate-6 transition-transform duration-300"
          />
          <div
            aria-hidden="true"
            className="absolute top-1/2 -right-8 -translate-y-1/2 w-48 h-48 sm:w-80 sm:h-80 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none"
          />

          {/* Content Layer */}
          <div className="relative z-10 max-w-2xl space-y-5 sm:space-y-6">
            {/* Top Micro-badge Chip */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold shadow-soft-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Safaricom M-PESA Ethiopia</span>
            </div>

            {/* One Clear Promise */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-slate-900 font-display">
              {t('hero.promise')}
            </h1>

            {/* Subtitle */}
            <p className="text-slate-500 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl font-normal">
              {t('hero.subtitle')}
            </p>

            {/* Actions: One Large Pill Button "Find deals near me" */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="lg"
                onClick={() => {
                  requestUserLocation();
                  scrollToSection('deals');
                }}
                disabled={isRequestingLocation}
                className="rounded-full min-h-[48px] sm:min-h-[52px] h-12 sm:h-13 px-7 sm:px-8 text-sm sm:text-base font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-soft-md hover:shadow-soft-lg active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-2.5"
              >
                <Navigation className={`w-4 h-4 text-emerald-400 ${isRequestingLocation ? 'animate-spin' : ''}`} />
                <span>{isRequestingLocation ? 'Locating...' : t('hero.findNearMe')}</span>
              </Button>

              <Badge variant="secondary" className="gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-slate-600 bg-slate-100/90 border-slate-200">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Bole, Addis Ababa · 2 km radius</span>
              </Badge>

              {isLiveLocation && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t('deals.liveLocation')}</span>
                </span>
              )}

              {/* Demo Simulate Walking Button (Only shown when URL has ?demo=1) */}
              {isDemoMode && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleWalkToShop}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 flex items-center gap-1 transition-colors cursor-pointer border border-amber-300"
                    title="Demo: Simulate proximity within 150m of shop"
                  >
                    <Footprints className="w-3.5 h-3.5 text-amber-600" />
                    <span>Demo 150m</span>
                  </button>
                  {isSimulatedLocation && (
                    <button
                      type="button"
                      onClick={handleBackToBole}
                      className="px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      {t('deals.backToBole')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Filter & Sorting Controls */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Category Segmented Control Built Dynamically From Loaded Deals */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
              {dynamicCategories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sort Selector with Translations */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 font-medium">{t('deals.sortLabel')}:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'distance' | 'discount' | 'price')}
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="distance">{t('deals.sortNearest')}</option>
                <option value="discount">{t('deals.sortDiscount')}</option>
                <option value="price">{t('deals.sortPrice')}</option>
              </select>
            </div>
          </div>

          {/* Active Status & Proximity Summary */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="flex items-center gap-1.5">
              <span>{t('deals.showingDealsCount')}:</span>
              <strong className="text-slate-900 font-bold font-mono tabular-nums">{filteredAndSortedDeals.length}</strong>
              <span>({t('deals.radiusNote')})</span>
            </span>

            <div className="flex items-center gap-3">
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="text-emerald-700 hover:underline font-semibold"
                >
                  {t('deals.clearFilter')}
                </button>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-emerald-700 hover:underline font-semibold"
                >
                  {t('deals.clearSearch')}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Deals Feed */}
        <section id="deals" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{t('trending.title')}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                You pay the exact price with M-PESA. After paying, you get a code to show at the counter.
              </p>
            </div>

            {/* List / Map View Switcher */}
            <div className="flex p-1 bg-slate-200/90 rounded-2xl shrink-0 border border-slate-300/60 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <List className="w-4 h-4" />
                <span>List View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] cursor-pointer ${
                  viewMode === 'map'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <Map className="w-4 h-4" />
                <span>Map View</span>
              </button>
            </div>
          </div>

          {/* Interactive Map of Shops & Deals */}
          {viewMode === 'map' && (
            <div className="space-y-4 animate-fade-in">
              <ShopsMap
                userLat={coords.lat}
                userLon={coords.lon}
                radiusMeters={radiusMeters}
                deals={filteredAndSortedDeals}
                onSelectDeal={setSelectedDealForDetails}
                onClaimDeal={(deal) => setSelectedDealForBuy(deal)}
                onChangeRadius={(r) => setRadiusMeters(r)}
                onLocateMe={requestUserLocation}
              />

              <div className="flex items-center justify-between pt-1 px-1">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Nearby Deals on Map ({filteredAndSortedDeals.length} found)
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Tap any shop pin to view details and claim deals
                </span>
              </div>
            </div>
          )}

          {/* SKELETON CARDS WHILE LOADING */}
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{isWakingUp ? t('deals.waking') : 'Scanning nearby approved shop promotions...'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-soft-sm flex flex-col justify-between space-y-4 animate-pulse"
                  >
                    {/* Media container placeholder */}
                    <div className="h-44 sm:h-48 w-full bg-slate-100 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-3 left-3 w-10 h-10 rounded-2xl bg-slate-200/80" />
                      <div className="absolute top-3 right-3 flex gap-1.5">
                        <div className="w-12 h-6 rounded-full bg-slate-200/80" />
                        <div className="w-16 h-6 rounded-full bg-slate-200/80" />
                      </div>
                    </div>

                    {/* Merchant & Title placeholder */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="w-24 h-3.5 rounded-full bg-slate-100" />
                        <div className="w-24 h-5 rounded-full bg-slate-100" />
                      </div>
                      <div className="w-full h-5 rounded-lg bg-slate-100" />
                      <div className="w-3/4 h-5 rounded-lg bg-slate-100" />
                    </div>

                    {/* Pricing & Button placeholder */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="w-12 h-3 rounded bg-slate-100" />
                        <div className="w-20 h-6 rounded bg-slate-100" />
                      </div>
                      <div className="w-32 h-11 rounded-full bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : loadError && filteredAndSortedDeals.length === 0 ? (
            /* FRIENDLY ERROR STATE WITH RETRY BUTTON */
            <div className="py-12 sm:py-16 text-center bg-white rounded-3xl border border-slate-100 p-6 sm:p-10 space-y-4 max-w-md mx-auto shadow-soft-md animate-fade-in">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-soft-xs border border-rose-100">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  {t('deals.errorTitle') || 'Unable to load deals'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {t('deals.errorDesc') || "We couldn't connect to the promotions service. Please check your connection and retry."}
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                size="default"
                onClick={() => loadDeals(coords.lat, coords.lon)}
                className="rounded-full px-6 min-h-[44px] inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('deals.retry') || 'Retry'}</span>
              </Button>
            </div>
          ) : filteredAndSortedDeals.length === 0 ? (
            /* FRIENDLY EMPTY STATE WITH RETRY BUTTON */
            <div className="py-12 sm:py-16 text-center bg-white rounded-3xl border border-slate-100 p-6 sm:p-10 space-y-4 max-w-md mx-auto shadow-soft-md animate-fade-in">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto shadow-soft-xs">
                <Store className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  {t('deals.empty') || 'No deals within 2 km of your location.'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  No promotions match your current criteria within 2.0 km of this zone.
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                size="default"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  handleBackToBole();
                }}
                className="rounded-full px-6 min-h-[44px] inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('deals.retry') || 'Retry'}</span>
              </Button>
            </div>
          ) : (
            /* STAGGERED FADE-IN OF CARDS (MOTION < 400MS, OFF WHEN REDUCED MOTION) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedDeals.map((deal, idx) => (
                <div
                  key={deal.dealId}
                  className="stagger-card h-full"
                  style={{
                    animation: 'fadeIn 250ms cubic-bezier(0.16, 1, 0.3, 1) both',
                    animationDelay: `${Math.min(idx * 30, 120)}ms`,
                  }}
                >
                  <DealCard
                    id={deal.dealId}
                    title={deal.title}
                    merchant={deal.merchantName}
                    location={deal.location}
                    category={deal.category}
                    originalPrice={deal.price}
                    finalAmount={deal.finalAmount}
                    discountPct={deal.discountPct}
                    distanceMeters={deal.distanceMeters}
                    image={deal.image}
                    verified={deal.verified}
                    onBuy={() => setSelectedDealForBuy(deal)}
                    onClick={() => setSelectedDealForDetails(deal)}
                    onMerchantClick={(m) => setSelectedMerchantForModal(m)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* How It Works & Cashless Safety Section with Full Translations */}
        <section id="how-it-works" className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-xs space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-widest font-mono">
              {t('how.badge')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t('how.title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {t('how.desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-mono font-bold flex items-center justify-center text-sm">
                01
              </div>
              <h3 className="font-bold text-slate-900 text-base">{t('how.step1Title')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('how.step1Desc')}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-mono font-bold flex items-center justify-center text-sm">
                02
              </div>
              <h3 className="font-bold text-slate-900 text-base">{t('how.step2Title')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('how.step2Desc')}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-mono font-bold flex items-center justify-center text-sm">
                03
              </div>
              <h3 className="font-bold text-slate-900 text-base">{t('how.step3Title')}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('how.step3Desc')}
              </p>
            </div>
          </div>
        </section>

        {/* Payment Explanation */}
        <section className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 rounded-2xl border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-3.5 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-emerald-950 text-sm">
              How payment works
            </p>
            <p className="text-emerald-800 leading-relaxed text-xs">
              You pay the exact price with M-PESA. After paying, you get a code to show at the counter.
            </p>
          </div>
        </section>
      </main>

      {/* Footer with Complete Translations (No Mini App Button) */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-12 text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Store className="w-4 h-4" />
            </div>
            <span className="font-black text-slate-900 text-base tracking-tight">
              Tirf<span className="text-emerald-600">Market</span>
            </span>
            <span className="text-slate-400 ml-2">{t('footer.tagline')}</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium">
            {isMerchant && (
              <>
                <Link href="/merchant/register" className="hover:text-emerald-700 transition-colors">
                  {t('footer.register')}
                </Link>
                <Link href="/dashboard" className="hover:text-emerald-700 transition-colors">
                  {t('footer.dashboard')}
                </Link>
              </>
            )}
            {/* My Claims and Sign In hidden unless confirmed real */}
          </div>
        </div>
      </footer>

      {/* Claim Error Toast */}
      {claimToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] bg-rose-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in">
          <span>{claimToast}</span>
          <button onClick={() => setClaimToast(null)} className="ml-2 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Direct Buy M-PESA STK Push Modal */}
      {selectedDealForBuy && (
        <MpesaModal
          isOpen={true}
          onClose={() => setSelectedDealForBuy(null)}
          dealId={selectedDealForBuy.dealId}
          dealTitle={selectedDealForBuy.title}
          amount={selectedDealForBuy.finalAmount}
          merchantName={selectedDealForBuy.merchantName}
          merchantId={selectedDealForBuy.merchantId}
        />
      )}

      {/* Pay at Shop Counter Modal for Claimed Ticket */}
      {selectedTicketForPay && (
        <MpesaModal
          isOpen={true}
          onClose={() => setSelectedTicketForPay(null)}
          dealId={selectedTicketForPay.dealId}
          dealTitle={selectedTicketForPay.dealTitle}
          amount={selectedTicketForPay.amount}
          merchantName={selectedTicketForPay.merchantName}
          merchantId={selectedTicketForPay.merchantId}
          claimTicketId={selectedTicketForPay.id}
        />
      )}

      {/* Active Claimed Offer Modal (Zero Upfront Pay-At-Shop Ticket) */}
      {activeClaimTicket && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-950 border-2 border-emerald-500/60 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-7 text-white relative space-y-5">
            <button
              onClick={() => setActiveClaimTicket(null)}
              className="absolute top-4 right-4 min-h-[36px] min-w-[36px] flex items-center justify-center bg-slate-900 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Offer Claimed • Counter Ticket Reserved</span>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">
                {activeClaimTicket.merchantName}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1 leading-snug">
                {activeClaimTicket.dealTitle}
              </h3>
            </div>

            {/* Countdown Badge */}
            <div className="flex items-center justify-between p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${claimCountdownSec <= 180 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Hold Validity</span>
                  <span className={`text-base font-mono font-black ${claimCountdownSec <= 180 ? 'text-rose-400' : 'text-amber-300'}`}>
                    {Math.floor(claimCountdownSec / 60)}m {claimCountdownSec % 60 < 10 ? '0' : ''}{claimCountdownSec % 60}s remaining
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">To Pay at Shop</span>
                <span className="text-lg font-mono font-black text-emerald-400">
                  {activeClaimTicket.amount} ETB
                </span>
              </div>
            </div>

            {/* QR Code & Redemption Code Display */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center gap-3">
              <QrCodeSvg value={activeClaimTicket.redemptionCode} size={150} className="mx-auto" />
              <div className="w-full flex items-center justify-between pt-1 border-t border-slate-800">
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-0.5">
                    Counter Code
                  </span>
                  <span className="text-2xl sm:text-3xl font-mono font-black text-white tracking-widest">
                    {activeClaimTicket.redemptionCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(activeClaimTicket.redemptionCode);
                      setCopiedClaimCode(true);
                      setTimeout(() => setCopiedClaimCode(false), 2000);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiedClaimCode ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You pay the exact price with M-PESA. After paying, you get a code to show at the counter.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const t = activeClaimTicket;
                  setActiveClaimTicket(null);
                  setSelectedTicketForPay(t);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm text-center shadow-lg transition-all cursor-pointer"
              >
                Pay with M-PESA at Counter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deal Details Modal */}
      {selectedDealForDetails && (
        <DealDetailsModal
          isOpen={true}
          onClose={() => setSelectedDealForDetails(null)}
          deal={selectedDealForDetails}
          onBuy={() => {
            const deal = selectedDealForDetails;
            setSelectedDealForDetails(null);
            setSelectedDealForBuy(deal);
          }}
          onPayAtShop={(ticket) => {
            setSelectedDealForDetails(null);
            setSelectedTicketForPay(ticket);
          }}
          onMerchantClick={(m) => setSelectedMerchantForModal(m)}
        />
      )}

      {/* Merchant Details Modal (Location, Rating, Past Offers) */}
      {selectedMerchantForModal && (
        <MerchantDetailModal
          isOpen={true}
          merchantName={selectedMerchantForModal}
          onClose={() => setSelectedMerchantForModal(null)}
          onSelectDeal={(dealId) => {
            const found = deals.find((d) => d.dealId === dealId);
            if (found) {
              setSelectedDealForDetails(found);
            }
          }}
        />
      )}
    </div>
  );
};
