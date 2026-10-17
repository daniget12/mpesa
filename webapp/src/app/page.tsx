'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import DealCard from '@/components/DealCard';
import MpesaModal from '@/components/MpesaModal';
import DealDetailsModal from '@/components/DealDetailsModal';
import { 
  Utensils, 
  Coffee, 
  Sparkles, 
  MonitorSmartphone, 
  Loader2, 
  MapPin, 
  AlertCircle, 
  RefreshCw, 
  Navigation,
  Compass,
  Sliders,
  ChevronDown,
  X,
  Pill,
  Scissors,
  Store,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { fetchNearbyDeals, NearbyDeal, ApiError } from '@/lib/api';

const DEFAULT_LAT = 9.0000;
const DEFAULT_LON = 38.7800;

const KNOWN_CATEGORIES = ['cafe', 'restaurant', 'grocery', 'pharmacy', 'tailor', 'barbershop'] as const;

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  cafe: Coffee,
  restaurant: Utensils,
  grocery: Store,
  pharmacy: Pill,
  tailor: Scissors,
  barbershop: Sparkles,
};

export default function Home() {
  const [selectedDealForDetails, setSelectedDealForDetails] = useState<NearbyDeal | null>(null);
  const [selectedDealForBuy, setSelectedDealForBuy] = useState<NearbyDeal | null>(null);
  const [deals, setDeals] = useState<NearbyDeal[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiveLocation, setIsLiveLocation] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isDemoPanelOpen, setIsDemoPanelOpen] = useState(false);
  const [isSimulatedLocation, setIsSimulatedLocation] = useState(false);
  const [dismissedMerchantId, setDismissedMerchantId] = useState<string | null>(null);

  // In-memory coordinates: NEVER saved to localStorage, NEVER logged to console.log
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: DEFAULT_LAT,
    lon: DEFAULT_LON,
  });

  const { t } = useLanguage();

  // Detect ?demo=1 from URL safely on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('demo') === '1') {
          setIsDemoMode(true);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Track 5-second server waking indicator for cold-start on Render free tier
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setIsWakingUp(true);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, [loading]);

  const loadDeals = React.useCallback(async (lat: number, lon: number) => {
    setIsWakingUp(false);
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNearbyDeals(lat, lon, 2000);
      setDeals(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 408) {
        setError(t('deals.waking'));
      } else {
        setError(t('deals.error') || 'Failed to connect to the deals service.');
      }
    } finally {
      setLoading(false);
      setIsWakingUp(false);
    }
  }, [t]);

  const requestUserLocation = React.useCallback(() => {
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
          // Denied or unavailable -> graceful fallback to 9.0000, 38.7800
          setIsRequestingLocation(false);
          setIsLiveLocation(false);
          setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
          loadDeals(DEFAULT_LAT, DEFAULT_LON);
        },
        { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
      );
    } else {
      setIsLiveLocation(false);
      setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
      loadDeals(DEFAULT_LAT, DEFAULT_LON);
    }
  }, [loadDeals]);

  const handleWalkToShop = () => {
    if (deals.length === 0) return;
    const firstDeal = deals[0];
    const baseLat = typeof firstDeal.lat === 'number' ? firstDeal.lat : DEFAULT_LAT;
    const baseLon = typeof firstDeal.lon === 'number' ? firstDeal.lon : DEFAULT_LON;
    // 150m north offset (1 deg lat ≈ 111,139m -> 150 / 111139 ≈ 0.00135)
    const simLat = baseLat + 0.00135;
    const simLon = baseLon;

    setIsSimulatedLocation(true);
    setIsLiveLocation(false);
    setDismissedMerchantId(null);
    setCoords({ lat: simLat, lon: simLon });
    loadDeals(simLat, simLon);
  };

  const handleBackToBole = () => {
    setIsSimulatedLocation(true);
    setIsLiveLocation(false);
    setDismissedMerchantId(null);
    setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
    loadDeals(DEFAULT_LAT, DEFAULT_LON);
  };

  useEffect(() => {
    // Attempt opt-in location on initial load, falling back cleanly if denied or unavailable
    const timer = setTimeout(() => {
      requestUserLocation();
    }, 0);
    return () => clearTimeout(timer);
  }, [requestUserLocation]);

  // Build category chips dynamically from loaded deals, plus "All"
  const categoryChips = React.useMemo(() => {
    const catsInDeals = new Set(
      deals.map((d) => (d.category || '').toLowerCase().trim()).filter(Boolean)
    );
    const presentCategories = KNOWN_CATEGORIES.filter((c) => catsInDeals.has(c));
    return [
      { id: 'all', label: t('cat.all') || 'All', icon: Sparkles },
      ...presentCategories.map((c) => ({
        id: c,
        label: t(`cat.${c}`) || c,
        icon: CATEGORY_ICONS[c] || Store,
      })),
    ];
  }, [deals, t]);

  // In-browser filtering with NO network requests: by category and title/merchantName
  const filteredDeals = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return deals.filter((d) => {
      const cat = (d.category || '').toLowerCase().trim();
      const matchesCategory = selectedCategory === 'all' || cat === selectedCategory;
      const matchesSearch =
        !q ||
        (d.title || '').toLowerCase().includes(q) ||
        (d.merchantName || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [deals, selectedCategory, searchQuery]);

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
    <div className="min-h-screen bg-gray-50 font-sans overflow-x-hidden w-full">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <main className="container mx-auto px-4 py-6 sm:py-8 w-full max-w-full">
        {/* Proximity Alert Banner (Nearest deal within 500 m) */}
        {isBannerVisible && nearestDeal && (
          <div className="mb-6 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 text-white rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-all">
            <div 
              onClick={() => setSelectedDealForDetails(nearestDeal)}
              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
            >
              <span className="p-2 bg-white/20 rounded-xl flex-shrink-0">
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </span>
              <div className="text-sm font-medium truncate">
                <span className="font-bold text-yellow-300">
                  {t("alert.near")} {nearestDeal.merchantName}:
                </span>{' '}
                <span>{nearestDeal.title}</span>,{' '}
                <span className="font-bold underline decoration-yellow-400">{nearestDeal.finalAmount} ETB</span>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDealForDetails(nearestDeal)}
                className="min-h-[44px] text-xs bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
              >
                {t("alert.view")}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissedMerchantId(nearestDeal.merchantId);
                }}
                aria-label="Dismiss proximity alert"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 hover:bg-white/20 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-800 via-green-700 to-yellow-600 rounded-3xl p-6 sm:p-8 mb-10 sm:mb-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500 rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500 rounded-full opacity-20 blur-3xl translate-y-1/2 -translate-x-1/3"></div>
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight">
              {t("hero.title")}
            </h1>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-green-50 leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <button 
                onClick={() => scrollToSection('deals')}
                className="min-h-[44px] bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 px-6 sm:px-8 rounded-full transition-colors shadow-lg cursor-pointer flex items-center justify-center text-sm sm:text-base"
              >
                {t("hero.explore")}
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="min-h-[44px] bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 text-white font-bold py-3 px-6 sm:px-8 rounded-full transition-colors cursor-pointer flex items-center justify-center text-sm sm:text-base"
              >
                {t("hero.how")}
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="mb-10 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 border-b-2 border-green-600 inline-block pb-1">
            {t("categories.title")}
          </h2>
          <div className="flex flex-wrap items-center gap-2.5">
            {categoryChips.map((chip) => {
              const isSelected = selectedCategory === chip.id;
              const Icon = chip.icon;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(chip.id);
                    scrollToSection('deals');
                  }}
                  className={`min-h-[44px] px-4 py-2.5 rounded-full flex items-center gap-2 text-sm font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-green-700 text-white border-green-700 shadow-sm ring-2 ring-green-500/20'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-xs'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-yellow-300' : 'text-gray-500'}`} />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* How it Works Section */}
        <div id="how-it-works" className="mb-14 sm:mb-16 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 scroll-mt-24">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center border-b-2 border-yellow-500 pb-2 mx-auto flex w-fit">
            Why Choose Tirf Market?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Hyperlocal Deals (2 km)</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Discover verified deals at local cafes, groceries, pharmacies, tailors and restaurants within 2 km. Pay live via Safaricom M-Pesa with instant voucher redemption.
              </p>
            </div>
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <MonitorSmartphone className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">{t("features.telegram.title")}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{t("features.telegram.desc")}</p>
            </div>
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Fast & Secure Payments</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Checkout is quick and secure using Safaricom M-Pesa. Receive your digital voucher instantly and claim your savings directly at the shop counter.
              </p>
            </div>
          </div>
        </div>

        {/* Deals Feed */}
        <div id="deals" className="scroll-mt-24">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 border-b-2 border-green-600 inline-block pb-1">
                {t("trending.title")}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-green-600" />
                  {isSimulatedLocation 
                    ? t("deals.simulatedLocation") 
                    : (isLiveLocation ? t("deals.liveLocation") : t("deals.defaultLocation"))} (2 km radius)
                </span>
                {isSimulatedLocation && (
                  <span className="bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                    {t("deals.simulatedLocation")}
                  </span>
                )}
                <span>•</span>
                <button
                  type="button"
                  onClick={requestUserLocation}
                  disabled={isRequestingLocation}
                  className="min-h-[44px] text-green-700 hover:text-green-800 font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" />
                  {isRequestingLocation ? 'Locating...' : (isLiveLocation ? 'Refresh Location' : t("deals.locateMe"))}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="min-h-[44px] text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-full cursor-pointer transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Clear category: {t(`cat.${selectedCategory}`) || selectedCategory}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="min-h-[44px] text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-full cursor-pointer transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Clear search: &ldquo;{searchQuery}&rdquo;</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          
          {/* STATE: LOADING */}
          {loading && (
            <div className="py-20 flex flex-col justify-center items-center text-center">
              <Loader2 className="w-10 h-10 animate-spin text-green-600 mb-3" />
              {isWakingUp ? (
                <div className="max-w-md bg-amber-50 border border-amber-200 text-amber-900 px-5 py-4 rounded-2xl shadow-xs animate-fade-in">
                  <div className="flex items-center justify-center gap-2 font-semibold text-sm mb-1 text-amber-900">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    Waking up the server...
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {t("deals.waking")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 font-medium">Finding verified deals within 2 km...</p>
              )}
            </div>
          )}

          {/* STATE: ERROR / OFFLINE */}
          {!loading && error && (
            <div className="py-16 text-center bg-white rounded-2xl border border-red-100 p-8 shadow-xs max-w-md mx-auto">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-1">{error}</h3>
              <p className="text-xs text-gray-500 mb-5">
                The backend server could be spinning up or temporarily unreachable.
              </p>
              <button
                type="button"
                onClick={() => loadDeals(coords.lat, coords.lon)}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors text-sm shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                {t("deals.retry")}
              </button>
            </div>
          )}

          {/* STATE: EMPTY */}
          {!loading && !error && filteredDeals.length === 0 && (
            <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 p-8 shadow-xs max-w-md mx-auto">
              <div className="w-12 h-12 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Compass className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-1">{t("deals.empty")}</h3>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                {searchQuery
                  ? `No deals matching "${searchQuery}" within 2 km.`
                  : selectedCategory !== 'all'
                  ? `No deals found under "${t(`cat.${selectedCategory}`) || selectedCategory}" within 2 km.`
                  : 'No promotions active within 2 km of your current coordinates.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="min-h-[44px] inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-5 rounded-xl transition-colors text-sm cursor-pointer shadow-xs"
                  >
                    Clear Search
                  </button>
                )}
                {selectedCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="min-h-[44px] inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-medium py-2.5 px-5 rounded-xl transition-colors text-sm cursor-pointer shadow-xs"
                  >
                    Show All Deals
                  </button>
                )}
                {!searchQuery && selectedCategory === 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery('');
                      setIsLiveLocation(false);
                      setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
                      loadDeals(DEFAULT_LAT, DEFAULT_LON);
                    }}
                    className="min-h-[44px] inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-medium py-2.5 px-5 rounded-xl transition-colors text-sm cursor-pointer shadow-xs"
                  >
                    Explore Addis Ababa Center
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STATE: SUCCESS WITH DEALS */}
          {!loading && !error && filteredDeals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDeals.map((deal) => (
                <DealCard 
                  key={deal.dealId}
                  id={deal.dealId}
                  title={deal.title}
                  merchant={deal.merchantName || 'Tirf Market Merchant'}
                  category={deal.category}
                  originalPrice={deal.price}
                  finalAmount={deal.finalAmount}
                  discountPct={deal.discountPct}
                  distanceMeters={deal.distanceMeters}
                  verified={deal.verified}
                  onBuy={() => setSelectedDealForBuy(deal)}
                  onClick={() => setSelectedDealForDetails(deal)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-12 pb-8 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b border-gray-800 pb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-1">
                <span className="text-yellow-500">Tirf</span> Market
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                The leading daily deal platform in Ethiopia. Discover, buy and share the best deals in your city.
              </p>
              <div className="flex gap-2">
                <div className="w-8 h-6 bg-green-600 rounded-sm"></div>
                <div className="w-8 h-6 bg-yellow-500 rounded-sm"></div>
                <div className="w-8 h-6 bg-red-600 rounded-sm"></div>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">Work with Us</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/dashboard" className="hover:text-white cursor-pointer">Merchant Center</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Payment Partners</h4>
              <div className="bg-white rounded p-2 inline-block">
                <span className="text-green-600 font-bold tracking-wider">M-PESA</span>
              </div>
            </div>
          </div>
          <div className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Tirf Market. All rights reserved. Made in Ethiopia.
          </div>
        </div>
      </footer>

      {/* Deal Details & Reviews Modal */}
      {selectedDealForDetails && (
        <DealDetailsModal 
          deal={selectedDealForDetails}
          isOpen={!!selectedDealForDetails}
          onClose={() => setSelectedDealForDetails(null)}
          onBuy={() => {
            const d = selectedDealForDetails;
            setSelectedDealForDetails(null);
            setSelectedDealForBuy(d);
          }}
        />
      )}

      {/* M-Pesa Payment Modal */}
      {selectedDealForBuy && (
        <MpesaModal 
          isOpen={!!selectedDealForBuy} 
          onClose={() => setSelectedDealForBuy(null)} 
          amount={selectedDealForBuy.finalAmount}
          dealTitle={selectedDealForBuy.title}
          dealId={selectedDealForBuy.dealId}
          merchantId={selectedDealForBuy.merchantId}
          merchantName={selectedDealForBuy.merchantName || 'Tirf Market Partner'}
        />
      )}

      {/* Floating Demo Panel (active only with ?demo=1) */}
      {isDemoMode && (
        <aside aria-label="Demo Controls" className="fixed bottom-6 right-6 z-40">
          {!isDemoPanelOpen ? (
            <button
              type="button"
              onClick={() => setIsDemoPanelOpen(true)}
              className="min-h-[44px] flex items-center gap-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-xl border border-purple-400/30 transition-transform active:scale-95 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-yellow-300" />
              <span>{t("demo.badge")}</span>
            </button>
          ) : (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-purple-200 p-4 w-72 text-gray-900">
              <div className="flex items-center justify-between mb-2.5 border-b border-gray-100 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-purple-900">
                  <Sliders className="w-3.5 h-3.5 text-purple-600" />
                  <span>{t("demo.panelTitle")}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDemoPanelOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors cursor-pointer"
                  aria-label="Collapse demo panel"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mb-3">
                Simulate movement to test proximity alerts and 2 km deal loading.
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleWalkToShop}
                  disabled={loading || deals.length === 0}
                  className="min-h-[44px] w-full flex items-center justify-between text-left text-xs bg-purple-50 hover:bg-purple-100 disabled:opacity-50 text-purple-900 font-semibold py-2.5 px-3 rounded-xl border border-purple-200 transition-colors cursor-pointer"
                >
                  <span>{t("demo.walkShop")}</span>
                  <Navigation className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={handleBackToBole}
                  disabled={loading}
                  className="min-h-[44px] w-full flex items-center justify-between text-left text-xs bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-800 font-medium py-2.5 px-3 rounded-xl border border-gray-200 transition-colors cursor-pointer"
                >
                  <span>{t("demo.boleCenter")}</span>
                  <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                </button>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
