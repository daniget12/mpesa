'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/MiniAppContext';
import { QrCodeSvg } from '../common/QrCodeSvg';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  MapPin, 
  Clock, 
  Navigation, 
  ArrowLeft 
} from 'lucide-react';

interface VoucherScreenProps {
  onBackToHome: () => void;
}

export const VoucherScreen: React.FC<VoucherScreenProps> = ({ onBackToHome }) => {
  const { activeClaim, pickupSecondsLeft, shops, language, t } = useApp();
  const [copied, setCopied] = useState(false);
  const [directionsModalOpen, setDirectionsModalOpen] = useState(false);

  useEffect(() => {
    // Confetti celebration if motion isn't reduced
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#059669', '#10b981', '#fbbf24', '#34d399'],
          disableForReducedMotion: true,
        });
      }
    }
  }, []);

  if (!activeClaim) return null;

  const shop = shops.find(s => s.id === activeClaim.shopId);

  const minutes = Math.floor(pickupSecondsLeft / 60);
  const seconds = pickupSecondsLeft % 60;
  const timerDisplay = `${minutes} min ${seconds < 10 ? '0' : ''}${seconds}s`;

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activeClaim.redemptionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden pb-20 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 p-1.5 -ml-1 rounded-lg hover:bg-slate-200/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'am' ? 'ወደ ዋና ገጽ' : 'Done'}</span>
        </button>

        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200/60">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>M-PESA Verified</span>
        </span>
      </div>

      <div className="p-5 space-y-6 text-center">
        {/* Paid Confirmation Header */}
        <div>
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2 shadow-sm">
            <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
            {t.paidSuccessTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cashless sale confirmed. Show this code to the merchant upon arrival.
          </p>
        </div>

        {/* ONE-TIME REDEMPTION CODE BOX (The Star Element) */}
        <div className="bg-slate-950 text-white rounded-3xl p-5 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none"></div>

          <div className="text-[11px] font-mono tracking-widest uppercase text-emerald-400 font-semibold mb-1">
            {t.oneTimeCode}
          </div>

          {/* Large 8-Character Code */}
          <div className="my-2 py-1 flex items-center justify-center gap-2">
            <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white selection:bg-emerald-600 tabular-nums">
              {activeClaim.redemptionCode}
            </span>
            <button
              onClick={handleCopyCode}
              aria-label="Copy redemption code"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition-all border border-slate-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* QR Code Block */}
          <div className="my-4 flex justify-center">
            <QrCodeSvg value={activeClaim.redemptionCode} size={170} />
          </div>

          {/* Pickup Window Countdown */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-left">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-mono">
                {t.pickupCountdown}
              </span>
              <span className="text-xs font-bold text-emerald-300 font-mono flex items-center gap-1 mt-0.5 tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                {t.validFor} {timerDisplay}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-mono">
                {t.receiptNo}
              </span>
              <span className="text-xs font-mono font-bold text-white mt-0.5">
                {activeClaim.mpesaReceipt || 'NLJ7RT61SV'}
              </span>
            </div>
          </div>
        </div>

        {/* Shop & Pickup Location Info Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 text-left space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pickup Counter
              </span>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">
                {language === 'am' && shop?.nameAm ? shop.nameAm : activeClaim.shopName}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span>{language === 'am' && shop?.addressAm ? shop.addressAm : shop?.address || 'Bole Medhanialem, Addis Ababa'}</span>
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Item:</span>
            <span className="font-bold text-slate-900">{activeClaim.dealTitle}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Amount Paid:</span>
            <span className="font-extrabold text-emerald-800 text-sm tabular-nums">
              {activeClaim.finalPrice} ETB (via M-PESA)
            </span>
          </div>

          {/* Directions Button */}
          <button
            onClick={() => setDirectionsModalOpen(true)}
            className="w-full mt-2 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t.getDirections}</span>
          </button>
        </div>

        {/* Safe Transaction Policy Hint */}
        <p className="text-[11px] text-slate-500 leading-relaxed px-2">
          {t.trustNote} If you are unable to pick this up before the countdown expires, an automated refund is submitted to your M-PESA account.
        </p>
      </div>

      {/* Mini Directions Modal */}
      {directionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 text-left">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-emerald-700" />
              <span>{t.directionsTo} {activeClaim.shopName}</span>
            </h4>
            <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                <span>Head east on Bole Road towards Edna Mall</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                <span>Turn right at Bole Medhanialem roundabout</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                <span>Arrive at {activeClaim.shopName} on your left (approx 3 min walk)</span>
              </div>
            </div>
            <button
              onClick={() => setDirectionsModalOpen(false)}
              className="w-full py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              Close Directions
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
