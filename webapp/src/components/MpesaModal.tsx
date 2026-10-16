'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Smartphone, ShieldCheck, RefreshCw, Zap } from 'lucide-react';
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [pollCountdown, setPollCountdown] = useState(90);
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

  if (!isOpen) return null;

  const startPolling = (orderId: string) => {
    stopPolling();
    setPollCountdown(90);

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

    // Poll GET /api/orders/:id every 2 seconds
    pollTimerRef.current = setInterval(async () => {
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
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('Polling check error:', msg);
      }
    }, 2000);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Network error. Please check your internet connection.');
      }
    }
  };

  // Demo override: Available ONLY when URL has ?demo=1 AND backend mode is 'mock'
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

  const handleClose = () => {
    stopPolling();
    setStatus('idle');
    setErrorMessage('');
    setPhoneError('');
    setActiveOrder(null);
    onClose();
  };

  const isMockMode = backendMode === 'mock';
  const showForceDemoButton = isDemoParam && isMockMode && status === 'loading' && !!activeOrder?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-gray-100">
        {/* Header close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* M-PESA Brand Header */}
          <div className="flex justify-center items-center gap-2 mb-4 flex-wrap">
            <div className="w-16 h-9 bg-green-600 rounded-lg flex items-center justify-center text-white font-black text-sm tracking-widest shadow-sm">
              M-PESA
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-green-800 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
              Safaricom Ethiopia
            </span>
            {isMockMode && (
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Demo payments
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-center text-gray-900 mb-1">
            {status === 'success' ? 'Voucher Confirmed!' : 'Cashless Checkout'}
          </h2>
          <p className="text-center text-gray-500 text-xs sm:text-sm mb-6 line-clamp-1">
            {dealTitle}
          </p>

          {/* Amount Box */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 mb-6 border border-green-100 flex justify-between items-center">
            <div>
              <span className="text-xs font-medium text-green-700 block uppercase tracking-wider">Discounted Price</span>
              <span className="text-2xl font-black text-gray-900">{Number(amount).toLocaleString()} ETB</span>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-white/80 px-2 py-1 rounded-md shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Secure STK
              </span>
            </div>
          </div>

          {/* FORM: IDLE or ERROR */}
          {(status === 'idle' || status === 'error') && (
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
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
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

              {status === 'error' && errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800">
                    <p className="font-semibold">Transaction Unsuccessful</p>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                {status === 'error' ? 'Retry Payment' : 'Claim Deal & Pay'}
              </button>
            </form>
          )}

          {/* STATE: LOADING / AWAITING STK PIN */}
          {status === 'loading' && (
            <div className="text-center py-6">
              <div className="relative inline-block mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                  <Smartphone className="w-8 h-8 text-green-600" />
                </div>
                <Loader2 className="w-20 h-20 text-green-600 animate-spin absolute -top-2 -left-2" />
              </div>

              <h3 className="font-bold text-gray-900 text-lg mb-1">Check Your Phone</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
                We sent a Safaricom M-PESA STK Push prompt to <strong>{phoneNumber}</strong>. Enter your PIN to approve the transaction.
              </p>

              <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full mb-6">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-green-600" />
                Polling payment status ({pollCountdown}s)
              </div>

              {/* Pitch-day instant override shortcut: ONLY shown when ?demo=1 AND backend mode is mock */}
              {showForceDemoButton && (
                <div className="border-t border-gray-100 pt-4 animate-fade-in">
                  <button
                    type="button"
                    onClick={handleForceInstantSuccess}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-600" />
                    Pitch Demo: Force Instant Confirmation
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STATE: SUCCESS / DIGITAL VOUCHER */}
          {status === 'success' && (
            <div className="py-2 text-center animate-scale-up">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-extrabold text-emerald-700 text-xl mb-1">Payment Confirmed!</h3>
              <p className="text-xs text-gray-500 mb-5">
                Cashless transaction processed via Safaricom M-PESA
              </p>

              {/* Digital Voucher Pass */}
              <div className="bg-gray-900 text-white rounded-2xl p-5 mb-5 text-left shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-start border-b border-gray-800 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Digital Voucher Ticket</span>
                    <h4 className="font-bold text-sm text-yellow-400">{dealTitle}</h4>
                    <p className="text-xs text-gray-300">{merchantName}</p>
                    {merchantId && <p className="text-[10px] text-gray-500 font-mono">MID: {merchantId.slice(0, 8)}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-400 block">PAID</span>
                    <span className="text-xs font-bold text-gray-200">{Number(activeOrder?.paidAmount || activeOrder?.amount || amount).toLocaleString()} ETB</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">M-PESA Receipt</span>
                    <span className="font-mono font-bold text-yellow-300">
                      {activeOrder?.mpesaReceipt || mockReceipt}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Customer Line</span>
                    <span className="font-mono text-gray-200">{activeOrder?.phone ? `+${activeOrder.phone}` : phoneNumber}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-dashed border-gray-700 text-center">
                  <span className="text-[11px] font-mono tracking-widest text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-800/40 inline-block">
                    VOUCHER PASS: TIRF-{(activeOrder?.id || 'DEMO').slice(0, 8).toUpperCase()}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">Show this pass & receipt at the counter</p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer"
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

