'use client';

import React, { useState } from 'react';
import {
  X,
  MapPin,
  Star,
  ShieldCheck,
  Tag,
  ExternalLink,
  Store,
  Navigation,
  CheckCircle2,
} from 'lucide-react';
import {
  getMerchantLocation,
  getMerchantOffers,
  getRatingForMerchant,
  getReviewsForMerchant,
  MerchantOfferItem,
} from '@/lib/claimsStorage';

interface MerchantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchantName: string;
  onSelectDeal?: (dealId: string) => void;
}

export default function MerchantDetailModal({
  isOpen,
  onClose,
  merchantName,
  onSelectDeal,
}: MerchantDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'past'>('all');

  if (!isOpen || !merchantName) return null;

  const location = getMerchantLocation(merchantName);
  const ratingInfo = getRatingForMerchant(merchantName);
  const reviews = getReviewsForMerchant(merchantName);
  const offers = getMerchantOffers(merchantName);

  const activeOffers = offers.filter((o) => o.status === 'active');
  const pastOffers = offers.filter((o) => o.status === 'past');

  const displayedOffers =
    activeTab === 'active'
      ? activeOffers
      : activeTab === 'past'
      ? pastOffers
      : offers;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl relative my-auto flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 min-h-[40px] min-w-[40px] flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 pr-10">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 shadow-inner">
              <Store className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400 text-slate-950 font-mono shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  e-Trade Verified
                </span>
                <span className="text-emerald-200 text-xs font-semibold">
                  · Addis Ababa
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
                {location.merchantName || merchantName}
              </h2>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Quick Stats Grid: Location, Rating, Offers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rating Box */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                <Star className="w-5 h-5 fill-white" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {ratingInfo.average.toFixed(1)}
                  </span>
                  <span className="text-xs text-amber-700 font-bold">/ 5.0</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Based on {ratingInfo.count} verified customer reviews
                </p>
              </div>
            </div>

            {/* Distance & Proximity Box */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block">
                  {location.distanceMeters ? `${location.distanceMeters} m away` : 'In Bole Quarter'}
                </span>
                <p className="text-xs text-slate-600 font-medium">
                  ~{location.walkMinutes || 4} min walking distance
                </p>
              </div>
            </div>
          </div>

          {/* Location & Map Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Shop Address & Location
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {location.address}
                  </p>
                  <p className="text-xs text-slate-600">
                    {location.city} · Lat: {location.lat.toFixed(4)}, Lon: {location.lon.toFixed(4)}
                  </p>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-emerald-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all shrink-0 cursor-pointer"
              >
                <span>Directions</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Visual Mini-Map Graphic Tile */}
            <div className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-200 flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-40 bg-slate-100"></div>
              <div className="relative z-10 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-300/80 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {location.merchantName}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Counter Verified · Addis Ababa
                </span>
              </div>
            </div>
          </div>

          {/* Past & Active Offers Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>Shop Offers & Promotions ({offers.length})</span>
              </h3>

              {/* Filter Tabs */}
              <div className="flex p-0.5 bg-slate-100 rounded-xl gap-0.5 text-xs font-bold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({offers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'active'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active ({activeOffers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('past')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'past'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Past ({pastOffers.length})
                </button>
              </div>
            </div>

            {/* Offers List */}
            {displayedOffers.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl text-xs font-medium border border-dashed border-slate-200">
                No offers found in this category.
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayedOffers.map((offer: MerchantOfferItem) => {
                  const isActive = offer.status === 'active';
                  return (
                    <div
                      key={offer.id}
                      onClick={() => {
                        if (isActive && onSelectDeal) {
                          onSelectDeal(offer.id);
                          onClose();
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-xs cursor-pointer'
                          : 'bg-slate-50/80 border-slate-200/80 opacity-75'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isActive ? 'Active Offer' : 'Past Offer'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {offer.date || (isActive ? 'Available' : 'Completed')}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {offer.title}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            -{offer.discountPct}%
                          </span>
                          <span className="text-base font-black font-mono text-emerald-700">
                            {offer.finalAmount} ETB
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 line-through">
                          {offer.originalPrice} ETB
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customer Reviews Section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Verified Customer Reviews ({reviews.length})</span>
            </h3>

            <div className="space-y-2.5">
              {reviews.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      {r.authorName}
                      {r.verifiedMpesa && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          M-PESA Paid
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < r.rating
                              ? 'text-amber-500 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-700 leading-relaxed italic">
                    &quot;{r.comment}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
