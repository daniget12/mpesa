'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Sparkles, ShoppingBag, Ticket, ArrowRight } from 'lucide-react';
import { WebNotification, markAsRead } from '@/lib/notifications';
import { useAuth } from '@/context/AuthContext';
import { getStoredToken } from '@/lib/dashboardApi';

interface ActiveToast extends WebNotification {
  toastId: string;
}

export default function NotificationToastContainer() {
  const pathname = usePathname();
  const { user, isMerchant: isAuthMerchant } = useAuth();
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<WebNotification>;
      const notif = customEvent.detail;
      if (!notif) return;

      // Determine active context based on route:
      // On /dashboard -> user is in merchant context
      // Everywhere else (/ and marketplace) -> user is in customer context
      const isDashboardRoute = pathname?.startsWith('/dashboard');
      const merchantToken = getStoredToken();

      if (isDashboardRoute) {
        // Merchant context: only logged-in merchants receive toasts
        const isMerchantLoggedIn = Boolean(merchantToken || isAuthMerchant);
        if (!isMerchantLoggedIn) return;

        // Strictly only show merchant notifications (sales / claims)
        if (notif.recipientType !== 'merchant') return;
        if (notif.type !== 'deal_claimed' && notif.type !== 'deal_bought') return;
      } else {
        // Customer context: only logged-in customers receive toasts
        if (!user) return;

        // Strictly only show customer notifications (deal discovery)
        // Notifications that are supposed to be sent to merchant must NOT be sent to customers!
        if (notif.recipientType !== 'customer') return;
        if (notif.type !== 'new_deal_nearby') return;
      }

      const toastId = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const active: ActiveToast = { ...notif, toastId };

      setToasts((prev) => [active, ...prev.slice(0, 2)]); // Show max 3 stacked toasts

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.toastId !== toastId));
      }, 6000);
    };

    window.addEventListener('tirf_notification_toast', handleToastEvent);
    return () => {
      window.removeEventListener('tirf_notification_toast', handleToastEvent);
    };
  }, [pathname, isAuthMerchant, user]);

  const handleDismiss = (toastId: string, notifId: string) => {
    markAsRead(notifId);
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.toastId}
          className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-2xl p-4 flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-top-4 fade-in"
          role="alert"
        >
          {/* Icon */}
          <div className="shrink-0 mt-0.5">
            {toast.type === 'deal_claimed' && (
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                <Ticket className="w-5 h-5" />
              </div>
            )}
            {toast.type === 'deal_bought' && (
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            )}
            {toast.type === 'new_deal_nearby' && (
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                {toast.title}
              </span>
              <button
                type="button"
                onClick={() => handleDismiss(toast.toastId, toast.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-snug mb-2">
              {toast.message}
            </p>

            {toast.link && (
              <Link
                href={toast.link}
                onClick={() => handleDismiss(toast.toastId, toast.id)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
              >
                <span>{toast.recipientType === 'merchant' ? 'Go to Dashboard' : 'Check It Out'}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
