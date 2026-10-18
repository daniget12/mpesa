import React, { useState } from 'react';
import Image from 'next/image';
import { MapPin, CheckCircle2, Coffee, Utensils, Store, Pill, Scissors, ShoppingBag } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  cafe: Coffee,
  coffee: Coffee,
  restaurant: Utensils,
  food: Utensils,
  grocery: Store,
  pharmacy: Pill,
  tailor: Scissors,
  barbershop: Scissors,
  bakery: Coffee,
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  cafe: 'from-amber-700 to-amber-900',
  coffee: 'from-amber-800 to-amber-950',
  restaurant: 'from-emerald-800 to-emerald-950',
  food: 'from-emerald-800 to-emerald-950',
  grocery: 'from-teal-800 to-slate-900',
  pharmacy: 'from-cyan-800 to-slate-900',
  tailor: 'from-indigo-800 to-slate-950',
  barbershop: 'from-violet-800 to-slate-950',
  bakery: 'from-amber-700 to-orange-950',
};

const CATEGORY_IMAGES: Record<string, string> = {
  cafe: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
  coffee: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
  food: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
  restaurant: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
  grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
  pharmacy: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=800',
  tailor: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&q=80&w=800',
  barbershop: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800',
};

const DEFAULT_DEAL_IMAGE = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800';

function formatDistance(meters?: number): string | null {
  if (meters === undefined || meters === null || isNaN(meters)) return null;
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

interface DealProps {
  id: string;
  title: string;
  merchant: string;
  location?: string;
  category?: string;
  originalPrice?: number;
  finalAmount: number;
  discountPct?: number;
  distanceMeters?: number;
  image?: string;
  verified?: boolean;
  bought?: number;
  onBuy: () => void;
  onClick?: () => void;
}

export default function DealCard({
  title,
  merchant,
  location,
  category,
  originalPrice,
  finalAmount,
  discountPct,
  distanceMeters,
  image,
  verified,
  bought = 0,
  onBuy,
  onClick,
}: DealProps) {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);
  const catKey = (category || 'cafe').toLowerCase();
  const IconComponent = CATEGORY_ICONS[catKey] || ShoppingBag;
  const gradientClass = CATEGORY_GRADIENTS[catKey] || 'from-emerald-800 to-slate-900';
  const displayImage = image || CATEGORY_IMAGES[catKey] || DEFAULT_DEAL_IMAGE;
  const distanceText = formatDistance(distanceMeters);

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-2xl overflow-hidden border border-slate-200/90 hover:border-emerald-400 hover:shadow-xl transition-all duration-300 flex flex-col h-full ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Visual Media Container with Resilient Fallback */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-900">
        {!imageError ? (
          <Image
            src={displayImage}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-6 text-white text-center`}>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-2">
              <IconComponent className="w-6 h-6 text-emerald-300" />
            </div>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-200/90">
              {t(`cat.${catKey}` as unknown as Parameters<typeof t>[0]) || category || 'Flash Deal'}
            </span>
          </div>
        )}

        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {verified ? (
            <div
              title={t("deal.approvedShop") || "Approved Shop"}
              className="bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm backdrop-blur-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t("deal.approvedShop") || "Approved"}</span>
            </div>
          ) : (
            <div className="bg-slate-900/80 text-slate-200 text-[11px] font-medium px-2.5 py-1 rounded-md backdrop-blur-xs">
              {t(`cat.${catKey}` as unknown as Parameters<typeof t>[0]) || category || 'Special'}
            </div>
          )}

          {discountPct !== undefined && discountPct > 0 && (
            <div className="bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-md shadow-sm font-mono tracking-tight">
              -{discountPct}%
            </div>
          )}
        </div>

        {/* Bottom Image Sub-strip: Category & Proximity */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-white/90 font-medium pointer-events-none">
          <span className="flex items-center gap-1 drop-shadow-sm text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{distanceText ? `${distanceText} ${t("deal.away") || "away"}` : (location || 'Addis Ababa')}</span>
          </span>
          {bought > 0 && (
            <span className="text-[10px] bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded text-emerald-300 font-mono">
              {bought}+ {t("deal.claimedCount") || "claimed"}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow">
        <div className="mb-1">
          <p className="text-xs font-semibold text-emerald-700 tracking-wide uppercase truncate">
            {merchant}
          </p>
          <h3 className="font-bold text-slate-900 text-base sm:text-lg line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
            {title}
          </h3>
        </div>

        {/* Price & Action Container */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            {originalPrice !== undefined && originalPrice > finalAmount && (
              <p className="text-xs text-slate-400 line-through font-mono">
                ETB {originalPrice}
              </p>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-emerald-700">ETB</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums tracking-tight">
                {finalAmount}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy();
            }}
            className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-2.5 px-4 sm:px-5 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>{t("deal.claim") || "Pay with M-PESA"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
