'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import DealCard from '@/components/DealCard';
import MpesaModal from '@/components/MpesaModal';
import DealDetailsModal from '@/components/DealDetailsModal';
import {
  Utensils,
  Coffee,
  Store,
  Pill,
  Scissors,
  MapPin,
  RefreshCw,
  Navigation,
  Compass,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Zap,
  Smartphone,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Search,
  X,
  Footprints,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { fetchNearbyDeals, NearbyDeal, ApiError } from '@/lib/api';
import { INITIAL_SHOPS, INITIAL_DEALS, calculateFinalPrice } from '@/mockData/miniapp';

const DEFAULT_LAT = 9.0000;
const DEFAULT_LON = 38.7800;

// Preset prominent Addis Ababa hubs for instant local radar targeting
const ADDIS_LOCATIONS = [
  { id: 'bole', name: 'Bole Medhanealem', nameAm: 'ቦሌ መድኃኔዓለም', lat: 9.0000, lon: 38.7800 },
  { id: '4kilo', name: '4 Kilo AAU Campus', nameAm: '4 ኪሎ ዩኒቨርሲቲ', lat: 9.0350, lon: 38.7610 },
  { id: '5kilo', name: '5 Kilo Engineering', nameAm: '5 ኪሎ ቴክኖሎጂ', lat: 9.0430, lon: 38.7620 },
  { id: 'kazanchis', name: 'Kazanchis / UNECA', nameAm: 'ካዛንቺስ', lat: 9.0180, lon: 38.7700 },
  { id: 'piazza', name: 'Piazza Historical', nameAm: 'ፒያሳ', lat: 9.0350, lon: 38.7520 },
  { id: 'mexico', name: 'Mexico Square', nameAm: 'ሜክሲኮ አደባባይ', lat: 9.0100, lon: 38.7470 },
];

const KNOWN_CATEGORIES = [
  { id: 'all', labelKey: 'cat.all', fallback: 'All Deals', icon: Sparkles },
  { id: 'cafe', labelKey: 'cat.cafe', fallback: 'Café & Coffee', icon: Coffee },
  { id: 'restaurant', labelKey: 'cat.restaurant', fallback: 'Restaurants', icon: Utensils },
  { id: 'bakery', labelKey: 'cat.bakery', fallback: 'Bakeries', icon: Coffee },
  { id: 'grocery', labelKey: 'cat.grocery', fallback: 'Groceries', icon: Store },
  { id: 'pharmacy', labelKey: 'cat.pharmacy', fallback: 'Pharmacy', icon: Pill },
  { id: 'barbershop', labelKey: 'cat.barbershop', fallback: 'Grooming & Salon', icon: Scissors },
];

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

export const WebsiteHome: React.FC = () => {
  const { isMerchant, isBuyer } = useAuth();
  const [selectedDealForDetails, setSelectedDealForDetails] = useState<NearbyDeal | null>(null);
  const [selectedDealForBuy, setSelectedDealForBuy] = useState<NearbyDeal | null>(null);
  const [deals, setDeals] = useState<NearbyDeal[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Full Location State
  const [isLiveLocation, setIsLiveLocation] = useState(false);
  const [isSimulatedLocation, setIsSimulatedLocation] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('bole');
  const [dismissedMerchantId, setDismissedMerchantId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'distance' | 'discount' | 'price'>('distance');

  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: DEFAULT_LAT,
    lon: DEFAULT_LON,
  });

  const { t, language } = useLanguage();

  const loadDeals = useCallback(async (lat: number, lon: number) => {
    setIsWakingUp(false);
    setLoading(true);
    setError(null);

    const coldStartTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, 4000);

    try {
      const data = await fetchNearbyDeals(lat, lon, 2000);
      clearTimeout(coldStartTimer);
      if (Array.isArray(data) && data.length > 0) {
        setDeals(data);
      } else {
        setDeals(getFallbackNearbyDeals(lat, lon));
      }
    } catch {
      clearTimeout(coldStartTimer);
      setDeals(getFallbackNearbyDeals(lat, lon));
    } finally {
      setLoading(false);
      setIsWakingUp(false);
    }
  }, []);

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
          setSelectedLocationId('gps');
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
    setSelectedLocationId('walk');
    setCoords({ lat: simLat, lon: simLon });
    loadDeals(simLat, simLon);
  };

  // Reset to Bole center
  const handleBackToBole = () => {
    setIsSimulatedLocation(false);
    setIsLiveLocation(false);
    setDismissedMerchantId(null);
    setSelectedLocationId('bole');
    setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
    loadDeals(DEFAULT_LAT, DEFAULT_LON);
  };

  const selectPredefinedLocation = (loc: typeof ADDIS_LOCATIONS[0]) => {
    setSelectedLocationId(loc.id);
    setIsSimulatedLocation(false);
    setIsLiveLocation(false);
    setDismissedMerchantId(null);
    setCoords({ lat: loc.lat, lon: loc.lon });
    loadDeals(loc.lat, loc.lon);
  };

  useEffect(() => {
    let ignore = false;
    const fetch = async () => {
      const coldStartTimer = setTimeout(() => {
        if (!ignore) setIsWakingUp(true);
      }, 4000);

      try {
        const data = await fetchNearbyDeals(coords.lat, coords.lon, 2000);
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
  }, [coords.lat, coords.lon]);

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

  const currentLocationLabel = useMemo(() => {
    if (isLiveLocation) return t('deals.liveLocation');
    if (isSimulatedLocation) return t('deals.simulatedLocation');
    const found = ADDIS_LOCATIONS.find((l) => l.id === selectedLocationId);
    if (found) {
      return language === 'am' ? found.nameAm : found.name;
    }
    return t('deals.defaultLocation');
  }, [isLiveLocation, isSimulatedLocation, selectedLocationId, language, t]);

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
        {/* Proximity Alert Banner (Interactive Location Feature) */}
        {isBannerVisible && nearestDeal && (
          <aside aria-label="Proximity Alert" className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 text-white rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div
              onClick={() => setSelectedDealForDetails(nearestDeal)}
              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
            >
              <div className="p-2 bg-white/20 rounded-xl shrink-0">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div className="text-xs sm:text-sm font-medium truncate">
                <span className="font-bold text-amber-300">
                  {t('alert.near')} {nearestDeal.merchantName}:
                </span>{' '}
                <span>{nearestDeal.title}</span>,{' '}
                <span className="font-black font-mono underline decoration-amber-400">{nearestDeal.finalAmount} ETB</span>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDealForDetails(nearestDeal)}
                className="min-h-[40px] text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center shadow-xs"
              >
                {t('alert.view')}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissedMerchantId(nearestDeal.merchantId);
                }}
                aria-label={t('alert.dismiss')}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </aside>
        )}

        {/* Architectural Hero Banner */}
        <section className="relative rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white p-6 sm:p-10 lg:p-12 overflow-hidden shadow-xl border border-emerald-900/60">
          <div className="relative z-10 max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.15] text-white">
              {t('hero.title')}
            </h1>

            <p className="text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl">
              {t('hero.subtitle')}
            </p>

            {/* Comprehensive Location Navigation & Simulation Strip */}
            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300/90">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{t('deals.zoneLabel')}: <strong className="text-white font-bold">{currentLocationLabel}</strong></span>
                </span>

                <span className="text-white/40">•</span>

                {/* Live GPS Detection Button */}
                <button
                  type="button"
                  onClick={requestUserLocation}
                  disabled={isRequestingLocation}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title={t('deals.locateMe')}
                >
                  <Navigation className={`w-3.5 h-3.5 ${isRequestingLocation ? 'animate-spin' : ''}`} />
                  <span>{isRequestingLocation ? 'Locating...' : (isLiveLocation ? t('deals.liveLocation') : t('deals.locateMe'))}</span>
                </button>

                {/* Simulate Walking Button */}
                <button
                  type="button"
                  onClick={handleWalkToShop}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Simulate proximity within 150m of venue"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>{t('deals.walkNearShop')}</span>
                </button>

                {isSimulatedLocation && (
                  <button
                    type="button"
                    onClick={handleBackToBole}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
                  >
                    {t('deals.backToBole')}
                  </button>
                )}
              </div>

              {/* Addis Ababa Campus / Neighborhood Quick Selector */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {ADDIS_LOCATIONS.map((loc) => {
                  const isSelected = selectedLocationId === loc.id && !isLiveLocation && !isSimulatedLocation;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => selectPredefinedLocation(loc)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                          : 'bg-white/10 hover:bg-white/15 text-slate-200'
                      }`}
                    >
                      {language === 'am' ? loc.nameAm : loc.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => scrollToSection('deals')}
                className="min-h-[44px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-6 rounded-xl transition-all shadow-md cursor-pointer text-xs sm:text-sm"
              >
                {t('hero.explore')}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="min-h-[44px] bg-white/15 hover:bg-white/25 backdrop-blur-xs border border-white/30 text-white font-bold py-2.5 px-6 rounded-xl transition-all cursor-pointer text-xs sm:text-sm"
              >
                {t('hero.how')}
              </button>
            </div>
          </div>

          {/* 4-Item Tabular Trust Strip with Full Translations */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-400">
                {t('trust.radiusTitle')}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {t('trust.radiusDesc')}
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-400">
                {t('trust.speedTitle')}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {t('trust.speedDesc')}
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-400">
                {t('trust.cashlessTitle')}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {t('trust.cashlessDesc')}
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-400">
                {t('trust.feeTitle')}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {t('trust.feeDesc')}
              </div>
            </div>
          </div>
        </section>

        {/* Filter & Sorting Controls */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Category Segmented Control with Translations */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
              {KNOWN_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const IconComponent = cat.icon;
                const label = t(cat.labelKey as unknown as Parameters<typeof t>[0]) || cat.fallback;
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
                    <span>{label}</span>
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t('trending.title')}
            </h2>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                {isWakingUp ? t('deals.waking') : 'Scanning nearby verified promotions...'}
              </p>
            </div>
          ) : filteredAndSortedDeals.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-4 max-w-md mx-auto shadow-xs">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                <Store className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">{t('deals.empty')}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  No promotions match your current criteria within 2.0 km of this zone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  handleBackToBole();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                {t('deals.backToBole')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedDeals.map((deal) => (
                <DealCard
                  key={deal.dealId}
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
                />
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
            {isBuyer && !isMerchant && (
              <Link href="/profile" className="hover:text-emerald-700 transition-colors">
                {t('header.myClaims') || 'My Claims'}
              </Link>
            )}
            <Link href="/login" className="hover:text-emerald-700 transition-colors">
              {t('footer.login')}
            </Link>
          </div>
        </div>
      </footer>

      {/* M-PESA STK Push Checkout Modal */}
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
        />
      )}
    </div>
  );
};
