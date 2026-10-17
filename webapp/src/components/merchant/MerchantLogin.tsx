'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/MiniAppContext';
import { ArrowLeft, Lock, Mail } from 'lucide-react';

interface MerchantLoginProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const MerchantLogin: React.FC<MerchantLoginProps> = ({ onBack, onSuccess }) => {
  const { setCurrentMerchantShopId } = useApp();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('manager@sunrisecafe.et');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError(null);
    setStep('code');
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    setCurrentMerchantShopId('shop-sunrise');
    onSuccess();
  };

  const handleDemoAutofill = () => {
    setEmail('manager@sunrisecafe.et');
    setStep('code');
    setCode('482910');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6 space-y-5 pb-20 animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="text-xs font-mono font-bold text-emerald-800">
          Merchant Access
        </span>
      </div>

      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-black text-slate-900">
          Merchant Sign In
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {step === 'email' 
            ? 'Enter your registered business email for a 6-digit access code' 
            : `We sent a 6-digit code to ${email}`}
        </p>
      </div>

      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Registered Shop Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="manager@sunrisecafe.et"
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              />
            </div>
            {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow transition-all"
          >
            Send 6-Digit Code
          </button>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              6-Digit Access Code
            </label>
            <input
              type="text"
              maxLength={6}
              required
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''));
                setError(null);
              }}
              placeholder="e.g. 482910"
              className="w-full h-12 text-center font-mono text-xl font-black tracking-widest rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            />
            {error && <p className="text-xs text-rose-600 mt-1 text-center">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow transition-all"
          >
            Verify & Enter Dashboard
          </button>
        </form>
      )}

      {/* Demo Fast Autofill */}
      <div className="pt-3 border-t border-slate-100 text-center">
        <button
          type="button"
          onClick={handleDemoAutofill}
          className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
        >
          <span>Demo quick login (Sunrise Café)</span>
        </button>
      </div>
    </div>
  );
};
