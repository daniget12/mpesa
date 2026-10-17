'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/MiniAppContext';
import { Deal } from '@/types/miniapp';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Flag, 
  ShieldCheck, 
  Coffee, 
  Utensils, 
  GlassWater, 
  BookOpen, 
  Scissors,
  AlertTriangle
} from 'lucide-react';

interface DealDetailProps {
  deal: Deal;
  onBack: () => void;
  onClaim: () => void;
}

export const DealDetail: React.FC<DealDetailProps> = ({ deal, onBack, onClaim }) => {
  const { shops, reportDeal, language, t } = useApp();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportReason, setReportReason] = useState('Incorrect price or expired');

  const shop = shops.find(s => s.id === deal.shopId);
  const isSelamOrNew = shop?.isNew || deal.shopId === 'shop-selam';

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Café': return <Coffee className="w-4 h-4" />;
      case 'Bakery': return <Utensils className="w-4 h-4" />;
      case 'Juice': return <GlassWater className="w-4 h-4" />;
      case 'Books': return <BookOpen className="w-4 h-4" />;
      case 'Barber': return <Scissors className="w-4 h-4" />;
      default: return <Coffee className="w-4 h-4" />;
    }
  };

  const handleReportSubmit = () => {
    reportDeal(deal.id, reportReason);
    setReportSuccess(true);
    setTimeout(() => {
      setReportModalOpen(false);
      setReportSuccess(false);
    }, 1500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden pb-20 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
        <button
          onClick={onBack}
          aria-label="Back to deals"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 p-1.5 -ml-1 rounded-lg hover:bg-slate-200/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'am' ? 'ተመለስ' : 'Back'}</span>
        </button>

        <span className="text-[11px] font-mono font-bold text-slate-400">
          {deal.itemCode}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Store Badge Banner */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              {getCategoryIcon(deal.category)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {language === 'am' && shop?.nameAm ? shop.nameAm : deal.shopName}
                </h3>
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
              <p className="text-[11px] text-slate-500">
                {language === 'am' && shop?.addressAm ? shop.addressAm : shop?.address || 'Bole, Addis Ababa'}
              </p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-950 leading-tight">
            {language === 'am' && deal.titleAm ? deal.titleAm : deal.title}
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            {language === 'am' && deal.descriptionAm ? deal.descriptionAm : deal.description}
          </p>
        </div>

        {/* Proximity & Availability Badges */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
          <div>
            <span className="text-[10px] font-medium text-slate-400 block uppercase">Distance</span>
            <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-emerald-600" />
              {deal.distanceMeters >= 1000 ? `${(deal.distanceMeters / 1000).toFixed(1)} km` : `${deal.distanceMeters} m`}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-medium text-slate-400 block uppercase">Walking</span>
            <span className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-emerald-600" />
              {deal.walkMinutes} min walk
            </span>
          </div>
          <div>
            <span className="text-[10px] font-medium text-slate-400 block uppercase">Inventory</span>
            <span className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
              {deal.unitsLeft} {t.left}
            </span>
          </div>
        </div>

        {/* Price Breakdown Card */}
        <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{t.original}</span>
            <span className="line-through tabular-nums">{deal.originalPrice} ETB</span>
          </div>
          <div className="flex items-center justify-between text-xs text-amber-700 font-semibold">
            <span>Hackathon Instant Discount</span>
            <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 rounded font-bold">
              −{deal.discountPct}% OFF
            </span>
          </div>
          <div className="pt-2 border-t border-emerald-200/80 flex items-baseline justify-between">
            <span className="text-sm font-bold text-emerald-950 uppercase tracking-wide">
              {t.youPay}
            </span>
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-800 tabular-nums">
                {deal.finalPrice}
              </span>
              <span className="text-sm font-bold text-emerald-900 ml-1">ETB</span>
              <p className="text-[10px] text-emerald-700 font-medium">Whole birr · via M-PESA</p>
            </div>
          </div>
        </div>

        {/* Trust Notice */}
        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-200/60">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-800">5-Minute Hold Protection:</span> When you tap Claim, 1 unit is reserved immediately for 5 minutes while you confirm your M-PESA payment.
          </div>
        </div>

        {/* Report this deal link */}
        <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
          <button
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-1 text-slate-500 hover:text-rose-600 underline text-[11px] transition-colors"
          >
            <Flag className="w-3 h-3" />
            <span>{t.reportDeal}</span>
          </button>
          <span className="text-[10px] font-mono text-slate-400">
            Valid today · Bole area
          </span>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-14 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg max-w-[480px] mx-auto z-30">
        <button
          onClick={onClaim}
          disabled={deal.unitsLeft <= 0}
          className="w-full h-12 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          <span>{deal.unitsLeft > 0 ? t.claimDeal : t.soldOutTitle}</span>
          <span className="text-xs bg-emerald-800 px-2 py-0.5 rounded font-mono">
            {deal.finalPrice} ETB
          </span>
        </button>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-2xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Report this deal</span>
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              Deals reported by 3 different shoppers are automatically hidden from the platform.
            </p>

            {reportSuccess ? (
              <div className="p-3 my-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t.reportedSuccess}</span>
              </div>
            ) : (
              <div className="my-4 space-y-2">
                {[
                  'Incorrect price or expired',
                  'Shop refused M-PESA payment',
                  'Items out of stock at counter',
                  'Other inaccuracy'
                ].map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 text-xs text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={reportReason === reason}
                      onChange={() => setReportReason(reason)}
                      className="accent-emerald-700"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            )}

            {!reportSuccess && (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportSubmit}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Submit Flag
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
