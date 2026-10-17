'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/MiniAppContext';
import { DealCard } from './DealCard';
import { MapView } from './MapView';
import { 
  Sparkles, 
  Map, 
  List, 
  Search, 
  Coffee, 
  Utensils, 
  GlassWater, 
  BookOpen, 
  Scissors, 
  ChevronRight, 
  Navigation 
} from 'lucide-react';

export const CustomerHome: React.FC = () => {
  const { 
    deals, 
    shops, 
    setSelectedDeal, 
    activeView, 
    setActiveView, 
    selectedCategory, 
    setSelectedCategory,
    language,
    t 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');

  const sunriseDeal = deals.find(d => d.shopId === 'shop-sunrise' && !d.isHidden);

  const categories = [
    { id: 'all', label: 'All Deals', labelAm: 'ሁሉም' },
    { id: 'Café', label: 'Café', labelAm: 'ካፌ', icon: <Coffee className="w-3.5 h-3.5" /> },
    { id: 'Bakery', label: 'Bakery', labelAm: 'ዳቦ ቤት', icon: <Utensils className="w-3.5 h-3.5" /> },
    { id: 'Juice', label: 'Juice', labelAm: 'ጁስ ቤት', icon: <GlassWater className="w-3.5 h-3.5" /> },
    { id: 'Books', label: 'Books', labelAm: 'መጻሕፍት', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'Barber', label: 'Barber', labelAm: 'ፀጉር ቤት', icon: <Scissors className="w-3.5 h-3.5" /> },
  ];

  const filteredDeals = deals
    .filter(deal => !deal.isHidden)
    .filter(deal => {
      if (selectedCategory !== 'all' && deal.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          deal.title.toLowerCase().includes(query) ||
          deal.shopName.toLowerCase().includes(query) ||
          (deal.titleAm && deal.titleAm.includes(query))
        );
      }
      return true;
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Proximity Banner (Demo Mode) */}
      {sunriseDeal && (
        <div 
          onClick={() => setSelectedDeal(sunriseDeal)}
          className="relative bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-3.5 shadow-md border border-emerald-700/60 cursor-pointer active:scale-[0.99] transition-transform overflow-hidden"
        >
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-emerald-500/20 rounded-full blur-xl pointer-events-none"></div>

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 shadow">
                <Navigation className="w-4 h-4 fill-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                    {language === 'am' ? 'አቅራቢያዎ ያለ ቅናሽ' : 'Nearby Alert · 120 m'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white leading-tight mt-0.5">
                  {t.nearBannerTitle}
                </h4>
                <p className="text-xs text-emerald-200 mt-0.5">
                  {t.nearBannerDesc}
                </p>
              </div>
            </div>

            <button 
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1 border border-white/20 self-center"
            >
              <span>{t.viewDeal}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* View Switcher & Search Bar */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'am' ? 'ሱቅ ወይም ቅናሽ ይፈልጉ...' : 'Search deals in Bole...'}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
          />
        </div>

        {/* Map / List Toggle */}
        <div className="flex p-0.5 bg-slate-200 rounded-xl shrink-0">
          <button
            onClick={() => setActiveView('list')}
            aria-label="List View"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
              activeView === 'list'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>{t.listView}</span>
          </button>
          <button
            onClick={() => setActiveView('map')}
            aria-label="Map View"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
              activeView === 'map'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>{t.mapView}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 min-h-[36px] ${
                isSelected
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.icon}
              <span>{language === 'am' ? cat.labelAm : cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main View: Map or List */}
      {activeView === 'map' ? (
        <div className="space-y-3">
          <MapView />
          {/* Recent list below map */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {language === 'am' ? 'አቅራቢያ ያሉ ቅናሾች' : 'Nearby Deals on Map'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {filteredDeals.length} available
              </span>
            </div>
            <div className="space-y-3">
              {filteredDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  shop={shops.find(s => s.id === deal.shopId)}
                  onClick={() => setSelectedDeal(deal)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {language === 'am' ? 'በቅርብ ርቀት የተደረደሩ' : 'Sorted by Distance'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {filteredDeals.length} {language === 'am' ? 'ቅናሾች' : 'deals found'}
            </span>
          </div>

          {filteredDeals.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">No deals match your search.</p>
              <p className="text-xs text-slate-500 mt-1">Try selecting another category or clearing search filters.</p>
              <button
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
                className="mt-3 px-3 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded-lg"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                shop={shops.find(s => s.id === deal.shopId)}
                onClick={() => setSelectedDeal(deal)}
              />
            ))
          )}
        </div>
      )}

      {/* Trust & Compliance Micro Footer */}
      <div className="mt-6 p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-emerald-950">
            {language === 'am' ? 'የታመነ የንግድ መድረክ' : 'TirfMarket Trust System'}
          </p>
          <p className="text-emerald-800/80 leading-relaxed">
            {t.trustNote}
          </p>
        </div>
      </div>
    </div>
  );
};
