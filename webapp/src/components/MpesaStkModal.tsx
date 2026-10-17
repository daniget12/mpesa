'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/MiniAppContext';
import { Delete, X, AlertCircle, Smartphone, ShieldCheck } from 'lucide-react';

export const MpesaStkModal: React.FC = () => {
  const { 
    stkModalOpen, 
    setStkModalOpen, 
    activeClaim, 
    customerPhone, 
    submitMpesaPayment, 
    cancelReservation,
    t 
  } = useApp();

  const [pin, setPin] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!stkModalOpen || !activeClaim) return null;

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
      setErrorMessage(null);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleConfirm = async () => {
    if (pin.length < 4) {
      setErrorMessage('Please enter your 4-digit M-PESA PIN');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    setTimeout(async () => {
      const result = await submitMpesaPayment(pin);
      setIsProcessing(false);
      if (!result.success) {
        setErrorMessage(result.error || 'Payment failed. Please try again.');
      } else {
        setPin('');
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Simulated USSD / STK Push Dialog */}
      <div className="w-full max-w-[340px] bg-slate-900 text-white rounded-3xl p-5 shadow-2xl border border-slate-700 relative overflow-hidden">
        {/* Top M-PESA Brand Tag */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider text-emerald-400">
              M-PESA
            </span>
            <span className="text-[10px] text-slate-400">STK Push Service</span>
          </div>
          <button 
            onClick={() => {
              setStkModalOpen(false);
            }}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount & Prompt Message */}
        <div className="py-4 text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
            <Smartphone className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">
            Pay {activeClaim.finalPrice} ETB to TirfMarket?
          </h4>
          <p className="text-[11px] text-slate-400 mt-1">
            Item: {activeClaim.dealTitle} ({activeClaim.itemCode})
          </p>
          <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
            Phone: {customerPhone}
          </p>
        </div>

        {/* PIN Entry Indicators */}
        <div className="mb-4">
          <div className="text-center text-xs text-slate-300 mb-2 font-medium">
            {t.enterPin}
          </div>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-9 h-11 rounded-lg border flex items-center justify-center text-lg font-bold transition-all ${
                  pin.length > index
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                    : 'border-slate-700 bg-slate-800/60 text-slate-500'
                }`}
              >
                {pin.length > index ? '•' : ''}
              </div>
            ))}
          </div>
          {errorMessage && (
            <div className="flex items-center gap-1.5 text-rose-400 text-[11px] justify-center mt-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* PIN Keypad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              disabled={isProcessing}
              className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-base font-semibold text-slate-100 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => cancelReservation()}
            disabled={isProcessing}
            className="h-11 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-xs font-semibold text-rose-400 flex items-center justify-center transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={isProcessing}
            className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-base font-semibold text-slate-100 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={isProcessing || pin.length === 0}
            aria-label="Backspace"
            className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Confirm Action Button */}
        <button
          onClick={handleConfirm}
          disabled={pin.length < 4 || isProcessing}
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Approving with M-PESA...</span>
            </div>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Confirm & Pay {activeClaim.finalPrice} ETB</span>
            </>
          )}
        </button>

        {/* Helper test note */}
        <div className="mt-3 text-center">
          <p className="text-[10px] text-slate-400">
            Sandbox test: <span className="text-emerald-400">251700404709</span> succeeds. Numbers ending <span className="text-rose-400">0000</span> fail.
          </p>
        </div>
      </div>
    </div>
  );
};
