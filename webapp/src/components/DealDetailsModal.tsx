'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, MapPin, Star, Ticket, Clock, Sparkles, Copy, Check, Smartphone } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { QrCodeSvg } from '@/components/common/QrCodeSvg';
import {
  getReviewsForDeal,
  getRatingForDeal,
  getRatingForMerchant,
  getDealQuota,
  claimDealOffer,
  CustomerClaimTicket,
} from '@/lib/claimsStorage';
import { getDealImage } from '@/lib/dealImages';

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
  onMerchantClick?: (merchantName: string) => void;
}

export default function DealDetailsModal({ deal, isOpen, onClose, onBuy, onPayAtShop, onMerchantClick }: DealDetailsModalProps) {
  const router = useRouter();
  const { user, isMerchant, isBuyer } = useAuth();
  const [claimedTicket, setClaimedTicket] = useState<CustomerClaimTicket | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // 10-second Claim countdown state
  const [claimActive, setClaimActive] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(10);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (claimActive) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setClaimActive(false);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [claimActive]);

  const dealKey = `${deal?.id || deal?.dealId || ''}_${isOpen}`;
  const [prevKey, setPrevKey] = useState(dealKey);
  if (dealKey !== prevKey) {
    setPrevKey(dealKey);
    setClaimedTicket(null);
    setClaimActive(false);
  }

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

  const handleClaimClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      router.push('/login?redirect=/');
      return;
    }
    setCountdown(10);
    setClaimActive(true);
  };

  const handleCancelClaim = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (timerRef.current) clearInterval(timerRef.current);
    setClaimActive(false);
    setCountdown(10);
  };

  const handlePayClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (timerRef.current) clearInterval(timerRef.current);
    setClaimActive(false);
    if (onBuy) {
      onBuy();
    } else {
      handleClaim();
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
              src={getDealImage(deal)} 
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
              <button
                type="button"
                onClick={() => {
                  if (onMerchantClick) {
                    onMerchantClick(merchantName);
                  }
                }}
                className="text-emerald-700 hover:text-emerald-800 hover:underline font-bold text-sm flex items-center gap-1 cursor-pointer transition-colors"
                title={`View ${merchantName} location, rating & past offers`}
              >
                <span>{merchantName}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onMerchantClick) {
                    onMerchantClick(merchantName);
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs hover:bg-amber-100 transition-colors cursor-pointer"
                title="View shop ratings & reviews"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span>{shopRating.average.toFixed(1)}</span>
                <span className="text-slate-400 font-normal">({shopRating.count} shop reviews)</span>
              </button>
            </div>

            {/* Payment Explanation */}
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 mb-6 text-xs text-emerald-950 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                You pay the exact price with M-PESA. After paying, you get a code to show at the counter.
              </p>
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

                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center gap-3">
                  <QrCodeSvg value={claimedTicket.redemptionCode} size={140} className="mx-auto" />
                  <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
                    <div className="text-left">
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
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  You pay the exact price with M-PESA. After paying, you get a code to show at the counter.
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
                  <p className="text-[11px] text-slate-500 font-medium">You pay the exact price with M-PESA.</p>
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
                  ) : !claimActive ? (
                    <button 
                      type="button"
                      onClick={handleClaimClick} 
                      className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg shadow-emerald-600/30 cursor-pointer text-base flex items-center gap-2"
                    >
                      <Ticket className="w-5 h-5" />
                      <span>Claim</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <button 
                        type="button"
                        onClick={handlePayClick} 
                        className="min-h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-600/30 cursor-pointer text-base flex items-center gap-2"
                      >
                        <Smartphone className="w-5 h-5" />
                        <span>Pay with M-PESA</span>
                        <span className="px-2 py-0.5 rounded-full bg-black/20 text-xs font-mono font-bold">
                          {countdown}s
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelClaim}
                        className="min-h-[44px] px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-sm cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
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
                      &ldquo;{rev.comment}&rdquo;
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
            ) : !claimActive ? (
              <button 
                type="button"
                onClick={handleClaimClick} 
                className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
              >
                <Ticket className="w-4 h-4" />
                <span>Claim</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-fade-in">
                <button 
                  type="button"
                  onClick={handlePayClick} 
                  className="min-h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2 px-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Pay with M-PESA</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] font-mono font-bold">
                    {countdown}s
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelClaim}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
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
