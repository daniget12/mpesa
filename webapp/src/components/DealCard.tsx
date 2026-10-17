import React from 'react';
import Image from 'next/image';
import { MapPin, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

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
  onClick
}: DealProps) {
  const { t } = useLanguage();
  const displayImage = image || (category && CATEGORY_IMAGES[category.toLowerCase()]) || DEFAULT_DEAL_IMAGE;
  const distanceText = formatDistance(distanceMeters);

  return (
    <div onClick={onClick} className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-100 flex flex-col h-full ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="relative h-48 w-full bg-gray-200">
        <Image 
          src={displayImage} 
          alt={title} 
          fill
          className="object-cover"
        />
        {discountPct !== undefined && discountPct > 0 && (
          <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">
            {discountPct}% OFF
          </div>
        )}
        {verified && (
          <div className="absolute top-2 left-2 bg-emerald-600/90 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
            <CheckCircle2 className="w-3 h-3" /> Verified
          </div>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-gray-900 text-lg line-clamp-2 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-2">{merchant}</p>
        
        <div className="flex items-center text-xs text-gray-500 mb-4 gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 
            {distanceText ? (
              <span className="font-semibold text-emerald-800">{distanceText}</span>
            ) : (
              <span>{location || 'Addis Ababa'}</span>
            )}
          </span>
          {bought > 0 && (
            <span className="flex items-center gap-1 text-green-700">{bought}+ {t("deal.bought")}</span>
          )}
        </div>
        
        <div className="mt-auto flex items-end justify-between pt-4 border-t border-gray-100">
          <div>
            {originalPrice !== undefined && originalPrice > finalAmount && (
              <p className="text-sm text-gray-400 line-through">{originalPrice} ETB</p>
            )}
            <p className="text-xl font-bold text-green-700">{finalAmount} ETB</p>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onBuy(); }}
            className="min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer shadow-sm hover:shadow"
          >
            {t("deal.claim") || t("deal.buyNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
