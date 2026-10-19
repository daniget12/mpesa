'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/MiniAppContext';
import { Clock, Smartphone, ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';

interface ClaimReserveModalProps {
  onBack: () => void;
  onInitiatePayment: () => void;
}

export const ClaimReserveModal: React.FC<ClaimReserveModalProps> = ({ onBack, onInitiatePayment }) => {
  const { 
    activeClaim, 
    reservationSecondsLeft, 
    customerPhone, 
    setCustomerPhone, 
    cancelReservation,
    t 
  } = useApp();

  const [phoneError, setPhoneError] = useState<string | null>(null);

  if (!activeClaim) return null;

  const minutes = Math.floor(reservationSecondsLeft / 60);
  const seconds = reservationSecondsLeft % 60;
  const formattedTimer = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const handlePayClick = () => {
    const cleaned = customerPhone.replace(/\D/g, '');
    if (cleaned.length < 9) {
      setPhoneError('Please enter a valid Ethiopian phone number (e.g. 07... or 2517...)');
      return;
    }
    setPhoneError(null);
    onInitiatePayment();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden pb-20 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
        <button
          onClick={() => {
            cancelReservation();
            onBack();
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 p-1.5 -ml-1 rounded-lg hover:bg-slate-200/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.cancelHold}</span>
        </button>

        <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
          Hold Active
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Reservation Status & Countdown Banner */}
        <div className="text-center py-2">
          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            {t.reservedForYou}
          </span>
          <h2 className="text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums flex items-center justify-center gap-2">
            <Clock className={`w-6 h-6 ${reservationSecondsLeft <= 60 ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`} />
            <span className={reservationSecondsLeft <= 60 ? 'text-rose-600' : 'text-slate-900'}>
              {formattedTimer}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {t.holdNotice}
          </p>
        </div>

        {/* Item Summary Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{activeClaim.shopName}</span>
            <span className="text-[10px] font-mono text-slate-400">{activeClaim.itemCode}</span>
          </div>
          <h4 className="text-base font-bold text-slate-900 leading-snug">
            {activeClaim.dealTitle}
          </h4>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Locked Price:</span>
            <span className="text-xl font-extrabold text-emerald-800 tabular-nums">
              {activeClaim.finalPrice} ETB
            </span>
          </div>
        </div>

        {/* Customer Phone Input Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            {t.phoneNumber}
          </label>
          <div className="relative">
            <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                setPhoneError(null);
              }}
              placeholder="07XXXXXXXX or 251700404709"
              className="w-full h-12 pl-10 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{t.phoneHelper}</span>
            <button
              type="button"
              onClick={() => setCustomerPhone('251700404709')}
              className="text-emerald-700 font-bold hover:underline"
            >
              Fill test phone
            </button>
          </div>
          {phoneError && (
            <p className="text-xs text-rose-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{phoneError}</span>
            </p>
          )}
        </div>

        {/* M-PESA STK Push Explanation */}
        <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Tapping the button below triggers an instant <strong>M-PESA prompt</strong> on your mobile device to authorize <strong>{activeClaim.finalPrice} ETB</strong>. No card needed.
          </p>
        </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-14 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg max-w-[480px] mx-auto z-30">
        <button
          onClick={handlePayClick}
          className="w-full h-12 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"
        >
          <span>{t.payWithMpesa.replace('{amount}', activeClaim.finalPrice.toString())}</span>
        </button>
      </div>
    </div>
  );
};
