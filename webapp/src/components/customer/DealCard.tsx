'use client';

import React from 'react';
import { Deal, Shop } from '@/types/miniapp';
import { useApp } from '@/context/MiniAppContext';
import { CheckCircle2, Sparkles, Coffee, Utensils, GlassWater, BookOpen, Scissors, MapPin, Clock } from 'lucide-react';

interface DealCardProps {
  deal: Deal;
  shop?: Shop;
  onClick: () => void;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, shop, onClick }) => {
  const { language, t } = useApp();

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

  const isSelamOrNew = shop?.isNew || deal.shopId === 'shop-selam';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-500/60 transition-all duration-200 overflow-hidden cursor-pointer active:scale-[0.99] text-left"
    >
      <div className="p-4">
        {/* Top Shop Line: Name, Badges, Category */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-800">
              {getCategoryIcon(deal.category)}
            </span>
            <span className="text-xs font-semibold text-slate-800 truncate">
              {language === 'am' && shop?.nameAm ? shop.nameAm : deal.shopName}
            </span>

            {/* Shop Verified or New Badge */}
            {isSelamOrNew ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded">
                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                <span>{t.newShop}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-medium rounded">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                <span>{t.verifiedShop}</span>
              </span>
            )}
          </div>

          {/* Distance */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 shrink-0">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>
              {deal.distanceMeters >= 1000 
                ? `${(deal.distanceMeters / 1000).toFixed(1)} km` 
                : `${deal.distanceMeters} m`}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-950 mb-1 leading-snug group-hover:text-emerald-800 transition-colors">
          {language === 'am' && deal.titleAm ? deal.titleAm : deal.title}
        </h3>

        {/* Description snippet */}
        <p className="text-xs text-slate-600 line-clamp-2 mb-3">
          {language === 'am' && deal.descriptionAm ? deal.descriptionAm : deal.description}
        </p>

        {/* Price & Action Strip */}
        <div className="pt-2 border-t border-slate-100 flex items-end justify-between gap-3">
          {/* Prices */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-emerald-800 tabular-nums">
                {deal.finalPrice} <span className="text-xs font-semibold text-emerald-950">ETB</span>
              </span>
              <span className="text-xs font-medium text-slate-400 line-through tabular-nums">
                {deal.originalPrice} ETB
              </span>
              <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[11px] font-black rounded-md leading-none">
                −{deal.discountPct}%
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{t.walk} {deal.walkMinutes} {t.min}</span>
            </div>
          </div>

          {/* Inventory chip */}
          <div className="shrink-0 flex flex-col items-end">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
              deal.unitsLeft <= 3 
                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
            }`}>
              {deal.unitsLeft} {t.left}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
