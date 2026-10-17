'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, AlertCircle, Smartphone, ShieldCheck, RefreshCw, Zap } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { 
  createOrder, 
  getOrderStatus, 
  forceMockResult, 
  getBackendHealth, 
  isValidEthiopianPhone, 
  sanitizePhone, 
  ApiError, 
  Order 
} from '@/lib/api';

function maskPhoneNumber(phone: string): string {
  const clean = phone.trim().replace(/[\s-]/g, '');
  if (clean.length < 6) return clean;
  const first4 = clean.slice(0, 4);
  const last2 = clean.slice(-2);
  const starCount = Math.max(clean.length - 6, 4);
  return `${first4}${'*'.repeat(starCount)}${last2}`;
}

const COUNTDOWN_TOTAL_SECONDS = 90;
const CIRCLE_RADIUS = 40;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~251.327

interface MpesaModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  dealTitle: string;
  dealId?: string;
  merchantId?: string;
  merchantName?: string;
}

export default function MpesaModal({
  isOpen,
  onClose,
  amount,
  dealTitle,
  dealId = 'deal-1',
  merchantId,
  merchantName = 'Tirf Market Partner',
}: MpesaModalProps) {
  const { t } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [pollCountdown, setPollCountdown] = useState(COUNTDOWN_TOTAL_SECONDS);
  const [backendMode, setBackendMode] = useState<string | null>(null);
  const [mockReceipt] = useState(() => 'MOCK' + Math.random().toString(36).substring(2, 8).toUpperCase());

  // Check URL query param ?demo=1 lazily without cascading effect renders
  const [isDemoParam] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('demo') === '1';
    }
    return false;
  });

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef<boolean>(false);

  // Check backend health for mock mode on open
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    getBackendHealth()
      .then((h) => {
        if (!isCancelled) setBackendMode(h.mode);
      })
      .catch(() => {
        if (!isCancelled) setBackendMode(null);
      });
    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Trigger short confetti burst on success (< 2 seconds, disabled when prefers-reduced-motion)
  useEffect(() => {
    if (status === 'success') {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!prefersReducedMotion) {
        import('canvas-confetti')
          .then((mod) => {
            const confetti = mod.default || mod;
            confetti({
              particleCount: 70,
              spread: 60,
              origin: { y: 0.65 },
              ticks: 100, // ~1.6s duration
              disableForReducedMotion: true,
            });
          })
          .catch(() => {});
      }
    }
  }, [status]);

  if (!isOpen) return null;

  const startPolling = (orderId: string) => {
    stopPolling();
    setPollCountdown(COUNTDOWN_TOTAL_SECONDS);

    // 90s countdown timer
    countdownTimerRef.current = setInterval(() => {
      setPollCountdown((prev) => {
        if (prev <= 1) {
          stopPolling();
          setStatus('error');
          setErrorMessage('Payment prompt timed out after 90 seconds. Please verify your phone has signal and retry.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Poll GET /api/orders/:id every 2 seconds without stacking
    pollTimerRef.current = setInterval(async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const order = await getOrderStatus(orderId);
        setActiveOrder(order);

        if (order.status === 'paid') {
          stopPolling();
          setStatus('success');
        } else if (order.status === 'failed') {
          stopPolling();
          setStatus('error');
          setErrorMessage(order.failureReason || 'Payment declined or cancelled on mobile handset.');
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 408) {
          console.warn('Poll request timed out');
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn('Polling check error:', msg);
        }
      } finally {
        isPollingRef.current = false;
      }
    }, 2000);
  };

  const handlePayment = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanPhone = sanitizePhone(phoneNumber);

    if (!cleanPhone) {
      setPhoneError('Please enter your Safaricom M-Pesa phone number.');
      return;
    }

    if (!isValidEthiopianPhone(cleanPhone)) {
      setPhoneError('Invalid phone number. Accepted formats: 07xxxxxxxx, 09xxxxxxxx, +2517..., +2519..., 002517..., or 12 digits starting 2517/2519.');
      return;
    }

    setPhoneError('');
    setStatus('loading');
    setErrorMessage('');

    try {
      // POST /api/orders with { dealId, phone } only. Never send an amount.
      const order = await createOrder(dealId, cleanPhone);
      setActiveOrder(order);

      if (order.status === 'paid') {
        setStatus('success');
        return;
      }

      if (order.status === 'failed') {
        setStatus('error');
        setErrorMessage(order.failureReason || 'Failed to dispatch payment prompt');
        return;
      }

      // Start polling for customer PIN entry (2s intervals, 90s timeout)
      startPolling(order.id);
    } catch (err: unknown) {
      setStatus('error');
      if (err instanceof ApiError) {
        if (err.status === 408) {
          setErrorMessage(t('deals.waking') + ' ' + t('deals.retry'));
        } else {
          setErrorMessage(err.message);
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Network error. Please check your internet connection.');
      }
    }
  };

  // Demo overrides: Available ONLY when URL has ?demo=1 AND backend mode is 'mock'
  const handleForceInstantSuccess = async () => {
    if (!activeOrder?.id) return;
    try {
      const updated = await forceMockResult(activeOrder.id, 'paid');
      setActiveOrder(updated);
      stopPolling();
      setStatus('success');
    } catch (e: unknown) {
      console.warn('Instant success override failed:', e);
    }
  };

  const handleForceInstantFailure = async () => {
    if (!activeOrder?.id) return;
    try {
      const updated = await forceMockResult(activeOrder.id, 'failed');
      setActiveOrder(updated);
      stopPolling();
      setStatus('error');
      setErrorMessage(updated.failureReason || 'Payment failed (Simulated failure)');
    } catch (e: unknown) {
      console.warn('Instant failure override failed:', e);
    }
  };

  const handleClose = () => {
    stopPolling();
    setStatus('idle');
    setErrorMessage('');
    setPhoneError('');
    setActiveOrder(null);
    onClose();
  };

  const isMockMode = backendMode === 'mock';
  const showDemoControls = isDemoParam && isMockMode && status === 'loading' && !!activeOrder?.id;

  // 3-step progress calculation
  // Step 1: "Request sent" (Done once loading/polling or success)
  // Step 2: "Enter your PIN on your phone" (Active while waiting for PIN)
  // Step 3: "Paid" (Active when success)
  const currentStep = status === 'success' ? 3 : status === 'loading' ? 2 : status === 'error' ? 2 : 1;
  const isStep1Complete = status === 'loading' || status === 'success' || (status === 'error' && !!activeOrder?.id);
  const isStep2Complete = status === 'success';

  // Countdown circle calculations
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - pollCountdown / COUNTDOWN_TOTAL_SECONDS);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative border-t sm:border border-gray-100 max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-slide-up sm:animate-fade-in">
        {/* Mobile bottom sheet drag handle */}
        <div className="sm:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-7 overflow-y-auto flex-1">
          {/* M-PESA Brand Header */}
          <div className="flex justify-center items-center gap-2 mb-3 flex-wrap">
            <div className="w-16 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-black text-xs tracking-widest shadow-xs">
              M-PESA
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-green-800 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
              Safaricom Ethiopia
            </span>
            {isMockMode && (
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Demo payments
              </span>
            )}
          </div>

          {/* 3-Step Progress Indicator */}
          <div className="w-full bg-gray-50/90 rounded-2xl p-2.5 sm:p-3 mb-4 border border-gray-100">
            <div className="flex items-center justify-between relative">
              {/* Connecting line */}
              <div className="absolute top-3.5 left-7 right-7 h-0.5 bg-gray-200 -z-0">
                <div 
                  className="h-full bg-green-600 transition-all duration-500" 
                  style={{ 
                    width: currentStep === 3 ? '100%' : currentStep === 2 ? '50%' : '0%' 
                  }}
                />
              </div>

              {/* Step 1: Request sent */}
              <div className="flex flex-col items-center relative z-10 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isStep1Complete 
                    ? 'bg-green-600 text-white shadow-xs' 
                    : 'bg-white border-2 border-green-600 text-green-700'
                }`}>
                  {isStep1Complete ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : '1'}
                </div>
                <span className={`text-[10px] sm:text-[11px] mt-1 text-center line-clamp-1 px-0.5 ${
                  currentStep >= 1 ? 'text-gray-900 font-semibold' : 'text-gray-400'
                }`}>
                  {t("mpesa.step1")}
                </span>
              </div>

              {/* Step 2: Enter PIN */}
              <div className="flex flex-col items-center relative z-10 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isStep2Complete 
                    ? 'bg-green-600 text-white shadow-xs' 
                    : currentStep === 2
                      ? status === 'error'
                        ? 'bg-red-500 text-white ring-4 ring-red-100'
                        : 'bg-green-600 text-white ring-4 ring-green-100 animate-pulse'
                      : 'bg-white border-2 border-gray-300 text-gray-400'
                }`}>
                  {isStep2Complete ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : '2'}
                </div>
                <span className={`text-[10px] sm:text-[11px] mt-1 text-center line-clamp-1 px-0.5 ${
                  currentStep === 2 
                    ? (status === 'error' ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold')
                    : currentStep > 2 
                      ? 'text-gray-900 font-medium' 
                      : 'text-gray-400'
                }`}>
                  {t("mpesa.step2")}
                </span>
              </div>

              {/* Step 3: Paid */}
              <div className="flex flex-col items-center relative z-10 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 3 
                    ? 'bg-green-600 text-white ring-4 ring-green-100 shadow-xs' 
                    : 'bg-white border-2 border-gray-300 text-gray-400'
                }`}>
                  {currentStep === 3 ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : '3'}
                </div>
                <span className={`text-[10px] sm:text-[11px] mt-1 text-center line-clamp-1 px-0.5 ${
                  currentStep === 3 ? 'text-green-700 font-bold' : 'text-gray-400'
                }`}>
                  {t("mpesa.step3")}
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-center text-gray-900 mb-0.5">
            {status === 'success' ? 'Payment Confirmed!' : 'Cashless Checkout'}
          </h2>
          <p className="text-center text-gray-500 text-xs mb-4 line-clamp-1">
            {dealTitle}
          </p>

          {/* Amount Box */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-3.5 sm:p-4 mb-4 border border-green-100 flex justify-between items-center">
            <div>
              <span className="text-[11px] font-medium text-green-700 block uppercase tracking-wider">Discounted Price</span>
              <span className="text-2xl font-black text-gray-900">{Number(amount).toLocaleString()} ETB</span>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-white/90 px-2.5 py-1 rounded-md shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Secure STK
              </span>
            </div>
          </div>

          {/* STATE: IDLE - Phone input & Claim/Pay button */}
          {status === 'idle' && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Safaricom M-Pesa Phone Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Smartphone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    placeholder="0711223344"
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all text-sm sm:text-base"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (phoneError) setPhoneError('');
                      if (errorMessage) setErrorMessage('');
                    }}
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Accepts <code>07xxxxxxxx</code>, <code>09xxxxxxxx</code>, <code>+251...</code>, <code>00251...</code>
                </p>
                {phoneError && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 mt-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium">{phoneError}</p>
                  </div>
                )}
              </div>

              {/* Large Pay Button within thumb reach on mobile */}
              <button
                type="submit"
                className="w-full min-h-[50px] bg-green-600 hover:bg-green-700 text-white font-bold text-base py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Smartphone className="w-4 h-4" />
                Claim Deal & Pay
              </button>
            </form>
          )}

          {/* STATE: LOADING / AWAITING STK PIN WITH 90s COUNTDOWN RING */}
          {status === 'loading' && (
            <div className="text-center py-2 sm:py-3">
              {/* Countdown Ring */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-3">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={CIRCLE_RADIUS}
                    className="stroke-gray-100"
                    strokeWidth="7"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={CIRCLE_RADIUS}
                    className="stroke-green-600 transition-all duration-1000 ease-linear"
                    strokeWidth="7"
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 leading-none">
                    {pollCountdown}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                    sec
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-1">
                {t("mpesa.step2")}
              </h3>
              <p className="text-xs text-gray-600 max-w-xs mx-auto mb-2 leading-relaxed">
                {t("mpesa.promptSentTo")} <strong className="text-gray-900 font-mono">{phoneNumber}</strong>
              </p>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto mb-4">
                {t("mpesa.confirmPinDesc")}
              </p>

              {/* Demo Controls panel: ONLY shown when URL has ?demo=1 AND backend mode is 'mock' */}
              {showDemoControls && (
                <div className="border-t border-gray-100 pt-3 mt-2 animate-fade-in">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-2 flex items-center justify-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Demo Controls
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={handleForceInstantSuccess}
                      className="min-h-[44px] inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Force Paid
                    </button>
                    <button
                      type="button"
                      onClick={handleForceInstantFailure}
                      className="min-h-[44px] inline-flex items-center gap-1 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Force Failed
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATE: ERROR / TIMEOUT WITH CLEAR MESSAGE & LARGE RETRY BUTTON */}
          {status === 'error' && (
            <div className="text-center py-2 sm:py-4">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                Transaction Unsuccessful
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 max-w-xs mx-auto mb-6 leading-relaxed">
                {errorMessage || 'Payment could not be completed. Please verify your phone number and network, then retry.'}
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handlePayment()}
                  className="w-full min-h-[50px] bg-green-600 hover:bg-green-700 text-white font-bold text-base py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t("mpesa.retry") || "Retry"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus('idle');
                    setErrorMessage('');
                  }}
                  className="w-full min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                >
                  {t("mpesa.changePhone") || "Change phone number"}
                </button>
              </div>
            </div>
          )}

          {/* STATE: SUCCESS / DIGITAL VOUCHER & RECEIPT CARD */}
          {status === 'success' && (
            <div className="py-1 text-center animate-scale-up">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Check className="w-8 h-8 text-emerald-600 stroke-[3]" />
              </div>
              <h3 className="font-extrabold text-emerald-700 text-xl mb-0.5">Payment Confirmed!</h3>
              <p className="text-xs text-gray-500 mb-4">
                Cashless transaction processed via Safaricom M-PESA
              </p>

              {/* Digital Voucher & Receipt Card */}
              <div className="bg-gradient-to-b from-gray-900 to-gray-950 text-white rounded-2xl p-4 sm:p-5 mb-4 text-left shadow-xl border border-gray-800 relative overflow-hidden">
                <div className="flex justify-between items-start border-b border-gray-800 pb-3 mb-3">
                  <div className="pr-2">
                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider block">
                      Digital Voucher Ticket
                    </span>
                    <h4 className="font-bold text-sm text-yellow-400 line-clamp-1">{dealTitle}</h4>
                    <p className="text-xs text-gray-300 line-clamp-1">{merchantName}</p>
                    {merchantId && (
                      <p className="text-[10px] text-gray-500 font-mono">MID: {merchantId.slice(0, 8)}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 inline-block mb-1">
                      PAID
                    </span>
                    <span className="text-sm sm:text-base font-bold text-gray-100 block">
                      {Number(activeOrder?.paidAmount || activeOrder?.amount || amount).toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">M-PESA Receipt</span>
                    <span className="font-mono font-bold text-yellow-300 break-all">
                      {activeOrder?.mpesaReceipt || mockReceipt}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Customer Line</span>
                    <span className="font-mono text-gray-200">
                      {maskPhoneNumber(phoneNumber)}
                    </span>
                  </div>
                </div>

                {/* Counter notice and voucher pass code */}
                <div className="pt-3 border-t border-dashed border-gray-700/80 text-center space-y-1.5">
                  <div className="inline-block text-[11px] font-mono tracking-widest text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-800/40">
                    VOUCHER: TIRF-{(activeOrder?.id || 'DEMO').slice(0, 8).toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold text-yellow-300 flex items-center justify-center gap-1">
                    <span>⭐</span> {t("mpesa.counterNote") || "Show this at the counter"}
                  </p>
                </div>
              </div>

              {/* Large Done Button */}
              <button
                onClick={handleClose}
                className="w-full min-h-[50px] bg-gray-900 hover:bg-black text-white font-bold py-3.5 px-4 rounded-xl transition-colors cursor-pointer text-base"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

