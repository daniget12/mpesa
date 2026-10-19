'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  MapPin,
  CheckCircle2,
  Coffee,
  Utensils,
  Store,
  Pill,
  Scissors,
  ShoppingBag,
  Smartphone,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

import { getDealImage } from '@/lib/dealImages';

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
  verified = true,
  onBuy,
  onClick,
}: DealProps) {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);

  const catKey = (category || 'cafe').toLowerCase();
  const IconComponent = CATEGORY_ICONS[catKey] || ShoppingBag;
  const displayImage = getDealImage({ title, category, image });
  const distanceText = formatDistance(distanceMeters);

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-soft-sm hover:shadow-soft-md transition-all duration-300 flex flex-col h-full relative ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Visual Media Container with Rounded Elements & Inset Calm Aesthetic */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden rounded-2xl bg-slate-100 mb-4">
        {!imageError ? (
          <Image
            src={displayImage}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-2">
              <IconComponent className="w-6 h-6 text-emerald-300" />
            </div>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-200">
              {category || 'Deal'}
            </span>
          </div>
        )}

        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

        {/* Category Icon Tile (Lucide) - Upper Left */}
        <div className="absolute top-3 left-3 w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md text-emerald-700 flex items-center justify-center shadow-soft-sm border border-white/60 pointer-events-none">
          <IconComponent className="w-5 h-5 text-emerald-700" />
        </div>

        {/* Distance Badge & Discount Pill - Upper Right */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none">
          {discountPct !== undefined && discountPct > 0 && (
            <Badge variant="highlight" className="font-mono font-bold text-xs rounded-full shadow-soft-xs">
              -{discountPct}%
            </Badge>
          )}

          <Badge className="bg-white/95 text-slate-800 backdrop-blur-md rounded-full border border-white/60 shadow-soft-xs text-[11px] font-medium gap-1">
            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>{distanceText || (location || 'Addis Ababa')}</span>
          </Badge>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-grow">
        {/* Merchant Name & Approved Shop Tick */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
            {merchant}
          </span>

          {verified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-2.5 py-0.5 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{t("deal.approvedShop") || "Approved shop"}</span>
            </span>
          )}
        </div>

        {/* Deal Title */}
        <h3 className="font-bold text-slate-900 text-base sm:text-lg line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors mb-4">
          {title}
        </h3>

        {/* Pricing & Large Pay Button Footer (>= 44px) */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            {originalPrice !== undefined && originalPrice > finalAmount && (
              <p className="text-xs text-slate-400 line-through font-mono">
                ETB {originalPrice}
              </p>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-emerald-700 font-mono">ETB</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums tracking-tight">
                {finalAmount}
              </span>
            </div>
          </div>

          {/* Large Pill Pay Button (at least 44px) */}
          <Button
            type="button"
            variant="mpesa"
            size="default"
            onClick={(e) => {
              e.stopPropagation();
              onBuy();
            }}
            className="min-h-[44px] h-11 sm:h-12 px-5 rounded-full font-bold text-xs sm:text-sm shadow-soft-sm hover:shadow-soft-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Smartphone className="w-4 h-4" />
            <span>{t("deal.payMpesa") || "Pay with M-PESA"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
