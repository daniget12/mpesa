'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import DealCard from '@/components/DealCard';
import MpesaModal from '@/components/MpesaModal';
import DealDetailsModal from '@/components/DealDetailsModal';
import { 
  Utensils, 
  Coffee, 
  Bed, 
  Sparkles, 
  MonitorSmartphone, 
  Car, 
  Loader2, 
  MapPin, 
  AlertCircle, 
  RefreshCw, 
  Navigation,
  Compass,
  Sliders,
  ChevronDown,
  X
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { fetchNearbyDeals, NearbyDeal } from '@/lib/api';

const DEFAULT_LAT = 9.0000;
const DEFAULT_LON = 38.7800;

export default function Home() {
  const [selectedDealForDetails, setSelectedDealForDetails] = useState<NearbyDeal | null>(null);
  const [selectedDealForBuy, setSelectedDealForBuy] = useState<NearbyDeal | null>(null);
  const [deals, setDeals] = useState<NearbyDeal[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
    } catch {
      setError(t('deals.error') || 'Failed to connect to the deals service.');
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

  const CATEGORIES = [
    { id: 'all', name: 'All', icon: Sparkles, color: 'bg-green-100 text-green-700' },
    { id: 'food', name: t('cat.food'), icon: Utensils, color: 'bg-orange-100 text-orange-600' },
    { id: 'cafe', name: t('cat.coffee'), icon: Coffee, color: 'bg-amber-100 text-amber-700' },
    { id: 'spa', name: t('cat.spa'), icon: Sparkles, color: 'bg-purple-100 text-purple-600' },
    { id: 'hotels', name: t('cat.hotels'), icon: Bed, color: 'bg-blue-100 text-blue-600' },
    { id: 'electronics', name: t('cat.electronics'), icon: MonitorSmartphone, color: 'bg-gray-100 text-gray-700' },
    { id: 'auto', name: t('cat.auto'), icon: Car, color: 'bg-red-100 text-red-600' },
  ];

  const filteredDeals = selectedCategory === 'all'
    ? deals
    : deals.filter((d) => {
        const cat = (d.category || '').toLowerCase();
        if (selectedCategory === 'food') return cat === 'food' || cat === 'grocery' || cat === 'restaurant';
        if (selectedCategory === 'cafe') return cat === 'cafe' || cat === 'coffee';
        return cat === selectedCategory;
      });

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

  const handleActionClick = (action: string) => {
    alert(`${action} feature coming soon!`);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Proximity Alert Banner (Nearest deal within 500 m) */}
        {isBannerVisible && nearestDeal && (
          <div className="mb-6 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4 transition-all">
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
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDealForDetails(nearestDeal)}
                className="text-xs bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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
                className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-800 via-green-700 to-yellow-600 rounded-3xl p-8 mb-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500 rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500 rounded-full opacity-20 blur-3xl translate-y-1/2 -translate-x-1/3"></div>
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              {t("hero.title")}
            </h1>
            <p className="text-lg md:text-xl mb-8 text-green-50">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => scrollToSection('deals')}
                className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 px-8 rounded-full transition-colors shadow-lg cursor-pointer"
              >
                {t("hero.explore")}
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 text-white font-bold py-3 px-8 rounded-full transition-colors cursor-pointer"
              >
                {t("hero.how")}
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-green-600 inline-block pb-1">{t("categories.title")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {CATEGORIES.map((cat) => (
              <div 
                key={cat.id} 
                onClick={() => {
                  setSelectedCategory(cat.id);
                  scrollToSection('deals');
                }}
                className={`bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-all border ${
                  selectedCategory === cat.id ? 'border-green-600 ring-2 ring-green-500/20 shadow-sm' : 'border-gray-100'
                }`}
              >
                <div className={`p-3 rounded-full ${cat.color}`}>
                  <cat.icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-700 text-center">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How it Works Section */}
        <div id="how-it-works" className="mb-16 bg-white rounded-3xl p-8 shadow-sm border border-gray-100 scroll-mt-24">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center border-b-2 border-yellow-500 inline-block pb-2 mx-auto flex w-fit">Why Choose Tirf Market?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Hyperlocal Deals (2 km)</h3>
              <p className="text-gray-600">Discover verified deals within walking distance. Pay live via Safaricom M-Pesa with instant voucher pass generation.</p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MonitorSmartphone className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Seamless Telegram Integration</h3>
              <p className="text-gray-600">Tirf Market isn&apos;t just a website. Connect with our Telegram Bot to get instant alerts on fresh deals directly on your phone so you never miss out.</p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Fast & Secure Payments</h3>
              <p className="text-gray-600">Checkout is quick and secure using Safaricom M-Pesa. Receive your digital voucher instantly and redeem it right at the counter.</p>
            </div>
          </div>
        </div>

        {/* Deals Feed */}
        <div id="deals" className="scroll-mt-24">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-600 inline-block pb-1">{t("trending.title")}</h2>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
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
                  className="text-green-700 hover:text-green-800 font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" />
                  {isRequestingLocation ? 'Locating...' : (isLiveLocation ? 'Refresh Location' : t("deals.locateMe"))}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full cursor-pointer transition-colors"
                >
                  Clear filter ({selectedCategory})
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
              <h3 className="font-bold text-gray-900 text-base mb-1">{t("deals.error")}</h3>
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
              <p className="text-xs text-gray-500 mb-5">
                {selectedCategory !== 'all' 
                  ? `No deals found under "${selectedCategory}" within 2 km.` 
                  : 'No promotions active within 2 km of your current coordinates.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setIsLiveLocation(false);
                  setCoords({ lat: DEFAULT_LAT, lon: DEFAULT_LON });
                  loadDeals(DEFAULT_LAT, DEFAULT_LON);
                }}
                className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-medium py-2 px-5 rounded-xl transition-colors text-sm cursor-pointer"
              >
                Explore Addis Ababa Center
              </button>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-gray-800 pb-8">
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
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => handleActionClick("Footer link")} className="hover:text-white cursor-pointer">About Us</button></li>
                <li><button onClick={() => handleActionClick("Footer link")} className="hover:text-white cursor-pointer">Careers</button></li>
                <li><button onClick={() => handleActionClick("Footer link")} className="hover:text-white cursor-pointer">Press</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Work with Us</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => handleActionClick("Footer link")} className="hover:text-white cursor-pointer">Run a Deal</button></li>
                <li><button onClick={() => handleActionClick("Footer link")} className="hover:text-white cursor-pointer">Merchant Center</button></li>
                <li><button onClick={() => handleActionClick("Footer link")} className="hover:text-white cursor-pointer">Affiliate Program</button></li>
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
              className="flex items-center gap-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-xl border border-purple-400/30 transition-transform active:scale-95 cursor-pointer"
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
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors cursor-pointer"
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
                  className="w-full flex items-center justify-between text-left text-xs bg-purple-50 hover:bg-purple-100 disabled:opacity-50 text-purple-900 font-semibold py-2.5 px-3 rounded-xl border border-purple-200 transition-colors cursor-pointer"
                >
                  <span>{t("demo.walkShop")}</span>
                  <Navigation className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={handleBackToBole}
                  disabled={loading}
                  className="w-full flex items-center justify-between text-left text-xs bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-800 font-medium py-2.5 px-3 rounded-xl border border-gray-200 transition-colors cursor-pointer"
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
