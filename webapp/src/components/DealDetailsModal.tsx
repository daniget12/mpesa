'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, MapPin, Star, Ticket, Clock, Sparkles, Copy, Check, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import {
  getReviewsForDeal,
  getRatingForDeal,
  getRatingForMerchant,
  getDealQuota,
  claimDealOffer,
  CustomerClaimTicket,
} from '@/lib/claimsStorage';

export interface ModalDeal {
  id?: string;
  dealId?: string;
  title: string;
  description?: string;
  category?: string;
  price?: number;
  original_price?: number;
  finalAmount?: number;
  discounted_price?: number;
  discountPct?: number;
  merchantName?: string;
  merchant_name?: string;
  location?: string;
  image?: string;
  image_url?: string;
  distanceMeters?: number;
  highlights?: string;
  fine_print?: string;
}

interface DealDetailsModalProps {
  deal: ModalDeal | null;
  isOpen: boolean;
  onClose: () => void;
  onBuy?: () => void;
  onPayAtShop?: (ticket: CustomerClaimTicket) => void;
}

export default function DealDetailsModal({ deal, isOpen, onClose, onBuy, onPayAtShop }: DealDetailsModalProps) {
  const { isMerchant, isBuyer } = useAuth();
  const [claimedTicket, setClaimedTicket] = useState<CustomerClaimTicket | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [quotaVersion, setQuotaVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setQuotaVersion((v) => v + 1);
    window.addEventListener('tirf_quota_updated', handleUpdate);
    window.addEventListener('tirf_claims_updated', handleUpdate);
    return () => {
      window.removeEventListener('tirf_quota_updated', handleUpdate);
      window.removeEventListener('tirf_claims_updated', handleUpdate);
    };
  }, []);

  // Reset claimed ticket on deal change or close
  useEffect(() => {
    setClaimedTicket(null);
  }, [deal?.id, deal?.dealId, isOpen]);

  // Live countdown timer for active hold
  useEffect(() => {
    if (!claimedTicket?.holdExpiresAt) return;

    const updateTimer = () => {
      const expiresAt = new Date(claimedTicket.holdExpiresAt!).getTime();
      const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsRemaining(left);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [claimedTicket]);

  if (!isOpen || !deal) return null;

  const original = deal.price || deal.original_price;
  const current = deal.finalAmount ?? deal.discounted_price ?? 0;

  const merchantName = deal.merchantName || deal.merchant_name || 'Tirf Market Partner';
  const dealId = deal.id || deal.dealId;
  const shopRating = getRatingForMerchant(merchantName);
  const dealRating = getRatingForDeal(dealId, merchantName, deal.title);
  const reviews = getReviewsForDeal(dealId, merchantName, deal.title);
  const quota = getDealQuota(dealId);

  const handleClaim = () => {
    if (quota.isSoldOut) return;
    const res = claimDealOffer({
      id: dealId || 'deal-custom',
      title: deal.title,
      merchantId: deal.merchantName,
      merchantName,
      finalAmount: current,
      originalPrice: original,
      discountPct: deal.discountPct,
    });
    if (res.success && res.ticket) {
      setClaimedTicket(res.ticket);
    }
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl relative my-auto flex flex-col overflow-hidden">
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 z-30 min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/90 rounded-full hover:bg-white text-gray-700 shadow-sm cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="relative h-64 sm:h-72 md:h-80 w-full bg-gray-200 shrink-0">
            <Image 
              src={deal.image || deal.image_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800'} 
              alt={deal.title} 
              fill 
              className="object-cover" 
            />
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 backdrop-blur-md">
              <MapPin className="w-4 h-4 text-green-400" /> {deal.distanceMeters ? (deal.distanceMeters < 1000 ? `${Math.round(deal.distanceMeters)} m` : `${(deal.distanceMeters / 1000).toFixed(1)} km`) : (deal.location || 'Addis Ababa')}
            </div>
          </div>
          
          <div className="p-5 sm:p-7">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{deal.title}</h2>
            
            {/* Merchant Identity & Shop Rating */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-gray-700 font-semibold text-sm">{merchantName}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span>{shopRating.average.toFixed(1)}</span>
                <span className="text-slate-400 font-normal">({shopRating.count} shop reviews)</span>
              </span>
            </div>

            {/* Quota & Hold Window Indicators */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 mb-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                  <span>Available Discounts Present:</span>
                </span>
                <span className={quota.isSoldOut ? 'text-slate-500' : quota.availableQuota <= 2 ? 'text-rose-600' : 'text-emerald-700'}>
                  {quota.isSoldOut ? '0 Available (Sold Out)' : `${quota.availableQuota} of ${quota.totalQuota} left`}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    quota.isSoldOut ? 'bg-slate-400' : quota.availableQuota <= 2 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, (quota.availableQuota / quota.totalQuota) * 100))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Merchant Hold Validity: <strong>{quota.holdMinutes} minutes</strong></span>
                </span>
                <span>Zero upfront payment to claim</span>
              </div>
            </div>

            {/* SUCCESS CLAIMED PASS (Displayed once buyer claims) */}
            {claimedTicket ? (
              <div className="p-6 bg-slate-950 border-2 border-emerald-500/50 rounded-2xl text-white mb-6 space-y-4 shadow-xl animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Offer Reserved • Counter Claim Ticket</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                    secondsRemaining <= 180 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expires in {formatCountdown(secondsRemaining)}</span>
                  </span>
                </div>

                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-0.5">
                      Counter Redemption Code
                    </span>
                    <span className="text-3xl font-mono font-black text-white tracking-widest">
                      {claimedTicket.redemptionCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(claimedTicket.redemptionCode)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-200" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Go to <strong>{merchantName}</strong> within <strong>{claimedTicket.holdMinutes} minutes</strong> to present this code and pay <strong>{current} ETB</strong> with M-PESA at the counter. If unpaid, this reservation automatically expires and returns to available quota.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onPayAtShop) {
                        onPayAtShop(claimedTicket);
                      } else if (onBuy) {
                        onBuy();
                      }
                      onClose();
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm text-center shadow-lg transition-all cursor-pointer"
                  >
                    Pay with M-PESA at Counter
                  </button>
                  <Link
                    href="/profile"
                    onClick={onClose}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm text-center border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>View in My Claims</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Desktop Claim Card */
              <div className="hidden md:flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6">
                <div>
                  {original !== undefined && current !== undefined && original > current && (
                    <p className="text-sm text-gray-400 line-through">{original} ETB</p>
                  )}
                  <p className="text-3xl font-black text-green-600">{current} ETB</p>
                  <p className="text-[11px] text-slate-500 font-medium">Pay after you go to the shop</p>
                </div>
                {isBuyer && !isMerchant ? (
                  quota.isSoldOut ? (
                    <button 
                      type="button"
                      disabled
                      className="min-h-[44px] bg-slate-200 text-slate-400 font-bold py-3 px-8 rounded-xl cursor-not-allowed text-base"
                    >
                      All Claimed
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={handleClaim} 
                      className="min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg shadow-green-600/30 cursor-pointer text-base flex items-center gap-2"
                    >
                      <Ticket className="w-5 h-5" />
                      <span>Claim Offer</span>
                    </button>
                  )
                ) : isMerchant ? (
                  <span className="text-xs font-semibold text-slate-500 bg-white px-4 py-2.5 rounded-xl border border-slate-200">
                    Merchant View
                  </span>
                ) : null}
              </div>
            )}
            
            <div className="space-y-4">
              {deal.description && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-1 text-sm">About This Deal</h4>
                  <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed">{deal.description}</p>
                </div>
              )}
              {deal.highlights && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-1 text-sm">Highlights</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{deal.highlights}</p>
                </div>
              )}
              {deal.fine_print && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-1 text-sm">The Fine Print</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">{deal.fine_print}</p>
                </div>
              )}
            </div>

            {/* Customer Reviews Section Under the Offer */}
            <div className="pt-6 mt-6 border-t border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    <span>Customer Reviews</span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      {dealRating.average.toFixed(1)} / 5.0
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Verified feedback from customers who claimed this offer
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg">
                  {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </span>
              </div>

              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                          {rev.authorName ? rev.authorName.charAt(0).toUpperCase() : 'B'}
                        </div>
                        <span className="text-xs font-bold text-gray-900">{rev.authorName}</span>
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Verified M-PESA
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed italic">
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Mobile Claim Bar (Hidden if already claimed) */}
        {!claimedTicket && isBuyer && !isMerchant ? (
          <div className="md:hidden sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 shadow-lg z-20 flex items-center justify-between gap-3">
            <div>
              {original !== undefined && current !== undefined && original > current && (
                <p className="text-xs text-gray-400 line-through">{original} ETB</p>
              )}
              <p className="text-2xl font-black text-green-600">{current} ETB</p>
            </div>
            {quota.isSoldOut ? (
              <button 
                type="button"
                disabled
                className="min-h-[44px] bg-slate-200 text-slate-400 font-bold py-2.5 px-6 rounded-xl cursor-not-allowed text-sm"
              >
                All Claimed
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleClaim} 
                className="min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-md shadow-green-600/30 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
              >
                <Ticket className="w-4 h-4" />
                <span>Claim Offer</span>
              </button>
            )}
          </div>
        ) : isMerchant ? (
          <div className="md:hidden sticky bottom-0 left-0 right-0 bg-slate-50 border-t border-slate-200 px-4 py-3 text-center text-xs font-semibold text-slate-500 z-20">
            Merchant View Only
          </div>
        ) : null}
      </div>
    </div>
  );
}
