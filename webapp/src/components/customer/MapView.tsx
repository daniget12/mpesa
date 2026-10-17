'use client';

import React from 'react';
import { useApp } from '@/context/MiniAppContext';
import { Shop } from '@/types/miniapp';
import { Coffee, Utensils, GlassWater, BookOpen, Scissors, Navigation } from 'lucide-react';

export const MapView: React.FC = () => {
  const { shops, deals, setSelectedDeal, language } = useApp();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Café': return <Coffee className="w-3.5 h-3.5" />;
      case 'Bakery': return <Utensils className="w-3.5 h-3.5" />;
      case 'Juice': return <GlassWater className="w-3.5 h-3.5" />;
      case 'Books': return <BookOpen className="w-3.5 h-3.5" />;
      case 'Barber': return <Scissors className="w-3.5 h-3.5" />;
      default: return <Coffee className="w-3.5 h-3.5" />;
    }
  };

  const handleSelectShop = (shop: Shop) => {
    const deal = deals.find(d => d.shopId === shop.id && !d.isHidden);
    if (deal) {
      setSelectedDeal(deal);
    }
  };

  return (
    <div className="relative w-full h-[360px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* SVG Stylized Bole Map */}
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Background Land */}
        <rect width="100" height="100" fill="#f1f5f2" />

        {/* 2 km Hyperlocal Boundary Circle around user (center: 50, 50) */}
        <circle 
          cx="50" 
          cy="50" 
          r="46" 
          fill="none" 
          stroke="#059669" 
          strokeWidth="0.8" 
          strokeDasharray="2 1.5" 
          opacity="0.45" 
        />

        {/* Major Roads in Bole */}
        <path d="M 0 15 L 100 85" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 0 15 L 100 85" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

        {/* Ring Road cross */}
        <path d="M 15 100 L 85 0" stroke="#cbd5e1" strokeWidth="3.5" />
        <path d="M 15 100 L 85 0" stroke="#ffffff" strokeWidth="1.8" />

        {/* Secondary Connector Streets */}
        <path d="M 25 35 L 75 35" stroke="#e2e8f0" strokeWidth="1.5" />
        <path d="M 30 65 L 85 65" stroke="#e2e8f0" strokeWidth="1.5" />
        <path d="M 50 15 L 50 85" stroke="#e2e8f0" strokeWidth="1.5" />
        <path d="M 70 20 L 70 80" stroke="#e2e8f0" strokeWidth="1.2" />

        {/* Bole Landmarks labels */}
        <text x="56" y="44" fontSize="3" fill="#64748b" fontWeight="600" opacity="0.8">Edna Mall</text>
        <text x="35" y="32" fontSize="2.8" fill="#64748b" opacity="0.8">Brass Hospital</text>
        <text x="65" y="58" fontSize="2.8" fill="#64748b" opacity="0.8">Bole Atlas</text>
        <text x="22" y="75" fontSize="2.8" fill="#64748b" opacity="0.8">Morning Star</text>
      </svg>

      {/* User Location Marker ("You are here") */}
      <div 
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
        style={{ left: '50%', top: '50%' }}
      >
        <div className="relative flex items-center justify-center">
          <span className="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></span>
          <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-white">
            <Navigation className="w-2.5 h-2.5 fill-white" />
          </div>
        </div>
        <div className="bg-slate-900/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap">
          You are here
        </div>
      </div>

      {/* Shop Pins */}
      {shops.map((shop) => {
        const matchingDeal = deals.find(d => d.shopId === shop.id && !d.isHidden);
        if (!matchingDeal) return null;

        return (
          <div
            key={shop.id}
            onClick={() => handleSelectShop(shop)}
            className="absolute z-20 -translate-x-1/2 -translate-y-full cursor-pointer group transition-transform hover:scale-110 active:scale-95"
            style={{ left: `${shop.mapCoords.x}%`, top: `${shop.mapCoords.y}%` }}
          >
            {/* Discount Flag */}
            <div className="flex flex-col items-center">
              <div className="bg-slate-900 text-white px-2 py-1 rounded-lg shadow-lg border border-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                <span className="p-0.5 bg-emerald-600 text-white rounded">
                  {getCategoryIcon(shop.category)}
                </span>
                <span className="text-[11px] font-bold">
                  {language === 'am' && shop.nameAm ? shop.nameAm : shop.name}
                </span>
                <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1 rounded">
                  -{matchingDeal.discountPct}%
                </span>
              </div>
              <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1 shadow-sm"></div>
            </div>
          </div>
        );
      })}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-sm rounded-xl p-2 border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1.5 font-medium text-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Bole Radius · Max 2 km</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Tap pin to view deal
        </div>
      </div>
    </div>
  );
};
