'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/MiniAppContext';
import { DealCard } from '../customer/DealCard';
import { calculateFinalPrice } from '@/mockData/miniapp';
import { Deal } from '@/types/miniapp';
import { ArrowLeft, Sparkles, Clock } from 'lucide-react';
import { setCustomDealQuota } from '@/lib/claimsStorage';

interface PostDealProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const PostDeal: React.FC<PostDealProps> = ({ onBack, onSuccess }) => {
  const { currentMerchantShop, postNewDeal } = useApp();

  const isNewShop = currentMerchantShop.isNew;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState<number>(200);
  const [discountPct, setDiscountPct] = useState<number>(25);
  const category = currentMerchantShop.category;
  const [itemCode, setItemCode] = useState(
    `${currentMerchantShop.name.slice(0, 3).toUpperCase()}-101`
  );
  const [expiryHours, setExpiryHours] = useState<number>(6);
  const [unitsAvailable, setUnitsAvailable] = useState<number>(isNewShop ? 10 : 50);
  const [holdMinutes, setHoldMinutes] = useState<number>(30); // Claim hold validity from merchant

  const maxDiscountAllowed = isNewShop ? 50 : 90;
  const maxUnitsAllowed = isNewShop ? 20 : 500;

  const finalPrice = calculateFinalPrice(originalPrice, discountPct);

  const previewDeal: Deal = {
    id: 'preview',
    shopId: currentMerchantShop.id,
    shopName: currentMerchantShop.name,
    title: title || 'Fresh Deal Title',
    description: description || 'Special discount for local shoppers.',
    originalPrice,
    discountPct,
    finalPrice,
    unitsTotal: unitsAvailable,
    unitsLeft: unitsAvailable,
    distanceMeters: currentMerchantShop.distanceMeters,
    walkMinutes: currentMerchantShop.walkMinutes,
    itemCode: itemCode || 'ITEM-01',
    category,
    expiryHours,
    reportCount: 0,
    isHidden: false,
    createdAt: 0,
    themeColor: '#059669',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || originalPrice <= 0 || unitsAvailable <= 0) return;

    const dealId = `d_miniapp_${Date.now()}`;
    // Register custom quota and validity hold window in storage
    setCustomDealQuota(
      dealId,
      Number(unitsAvailable),
      Number(holdMinutes),
      currentMerchantShop.name,
      title.trim()
    );

    postNewDeal({
      shopId: currentMerchantShop.id,
      shopName: currentMerchantShop.name,
      title: title.trim(),
      description: description.trim() || 'Daily special discount.',
      originalPrice: Number(originalPrice),
      discountPct: Number(discountPct),
      unitsTotal: Number(unitsAvailable),
      unitsLeft: Number(unitsAvailable),
      distanceMeters: currentMerchantShop.distanceMeters,
      walkMinutes: currentMerchantShop.walkMinutes,
      itemCode: itemCode.trim() || 'ITEM-01',
      category: category,
      expiryHours: Number(expiryHours),
    });

    onSuccess();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden pb-20 animate-in fade-in duration-200">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 p-1.5 -ml-1 rounded-lg hover:bg-slate-200/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <span className="text-xs font-bold text-emerald-800">
          Post Deal
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* New Shop Limits Banner */}
        {isNewShop && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>New Shop Protection Rules (First 7 Days)</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              New-shop limits for 7 days: max 3 active deals, max 50% discount, deals up to 7 days, max 20 units.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Deal Title */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Deal Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fresh Honey Cake & Coffee"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the items included in this deal..."
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all resize-none"
            />
          </div>

          {/* Prices Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Original Price (ETB) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={originalPrice}
                onChange={(e) => setOriginalPrice(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Permanent Item Code
              </label>
              <input
                type="text"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                placeholder="e.g. SRC-014"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              />
            </div>
          </div>

          {/* Discount Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
              <span>Discount Percentage:</span>
              <span className="text-emerald-800 font-extrabold">{discountPct}% OFF</span>
            </div>
            <input
              type="range"
              min={5}
              max={maxDiscountAllowed}
              step={5}
              value={discountPct}
              onChange={(e) => setDiscountPct(parseInt(e.target.value))}
              className="w-full accent-emerald-700 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
              <span>5%</span>
              <span>Max {maxDiscountAllowed}%</span>
            </div>
          </div>

          {/* Units Available & Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Discounts Present (Quota) *
              </label>
              <input
                type="number"
                min={1}
                max={maxUnitsAllowed}
                required
                value={unitsAvailable}
                onChange={(e) => setUnitsAvailable(Math.min(maxUnitsAllowed, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Deal Expiry
              </label>
              <select
                value={expiryHours}
                onChange={(e) => setExpiryHours(parseInt(e.target.value))}
                className="w-full h-10 px-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              >
                <option value={2}>2 Hours</option>
                <option value={4}>4 Hours</option>
                <option value={8}>8 Hours</option>
                <option value={24}>24 Hours (1 Day)</option>
                <option value={72}>3 Days</option>
              </select>
            </div>
          </div>

          {/* Claim Hold Validity Window */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Claim Hold Validity Window (Merchant Duration)</span>
              </label>
              <span className="text-xs font-extrabold text-emerald-800">{holdMinutes} min</span>
            </div>
            <select
              value={holdMinutes}
              onChange={(e) => setHoldMinutes(parseInt(e.target.value))}
              className="w-full h-10 px-2 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            >
              <option value={15}>15 Minutes</option>
              <option value={20}>20 Minutes</option>
              <option value={30}>30 Minutes (Recommended)</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes (1 Hour)</option>
              <option value={120}>120 Minutes (2 Hours)</option>
            </select>
            <p className="text-[10px] text-emerald-800 leading-tight">
              Buyers claim with 0 ETB upfront. If they do not pay at your counter within this window, quota is reversed back to available offers automatically.
            </p>
          </div>

          {/* LIVE CUSTOMER CARD PREVIEW */}
          <div className="pt-3 border-t border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Live Customer Card Preview
            </span>
            <DealCard
              deal={previewDeal}
              shop={currentMerchantShop}
              onClick={() => {}}
            />
          </div>

          {/* Final price formula note */}
          <div className="p-3 bg-emerald-50 rounded-xl text-[11px] text-emerald-950 flex items-center justify-between font-mono">
            <span>Customer pays:</span>
            <span className="text-base font-extrabold text-emerald-800">
              {finalPrice} ETB (whole birr)
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full h-12 bg-emerald-700 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/20 transition-all"
          >
            Publish Deal to Nearby Shoppers
          </button>
        </form>
      </div>
    </div>
  );
};
