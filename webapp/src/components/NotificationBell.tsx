'use client';

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  Ticket,
  Sparkles,
  ExternalLink,
  Trash2,
  Lock,
  LogIn,
} from 'lucide-react';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  WebNotification,
} from '@/lib/notifications';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePathname } from 'next/navigation';
import { getStoredToken } from '@/lib/dashboardApi';

interface NotificationBellProps {
  onDealClick?: (dealId: string) => void;
  role?: 'merchant' | 'customer';
  merchantId?: string;
}

function subscribeStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('tirf_notifications_updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('tirf_notifications_updated', callback);
  };
}

function getStoredTokenSnapshot(): string | null {
  return getStoredToken();
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

export default function NotificationBell({ onDealClick, role, merchantId }: NotificationBellProps) {
  const pathname = usePathname();
  const { user, isMerchant: isAuthMerchant } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const merchantToken = useSyncExternalStore(
    subscribeStorage,
    getStoredTokenSnapshot,
    () => null
  );

  // Determine effective persona role:
  // 1. Explicit role prop if passed
  // 2. If current pathname is /dashboard -> 'merchant'
  // 3. Otherwise -> 'customer'
  const effectiveRole: 'merchant' | 'customer' =
    role || (pathname?.startsWith('/dashboard') ? 'merchant' : 'customer');

  const isMerchantPersona = effectiveRole === 'merchant';

  // Strict role login gating:
  // - Customer notifications only work if logged in as customer (user is non-null)
  // - Merchant notifications only work if logged in as merchant (merchantToken or isAuthMerchant)
  const isLoggedIn = isMerchantPersona
    ? Boolean(merchantToken || isAuthMerchant)
    : Boolean(user);

  const [rawNotifications, setRawNotifications] = useState<WebNotification[]>(() => {
    if (typeof window === 'undefined') return [];
    return getNotifications(effectiveRole, merchantId);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    const handleUpdate = () => {
      setRawNotifications(getNotifications(effectiveRole, merchantId));
    };

    window.addEventListener('tirf_notifications_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('tirf_notifications_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [effectiveRole, merchantId, isLoggedIn]);

  const notifications = isLoggedIn ? rawNotifications : [];

  // Click outside and escape key handling
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const handleNotificationClick = (notif: WebNotification) => {
    markAsRead(notif.id);
    if (notif.dealId && onDealClick) {
      onDealClick(notif.dealId);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead(effectiveRole);
  };

  const handleClearAll = () => {
    clearNotifications(effectiveRole);
  };

  const renderIcon = (type: WebNotification['type']) => {
    switch (type) {
      case 'deal_claimed':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Ticket className="w-4 h-4" />
          </div>
        );
      case 'deal_bought':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
        );
      case 'new_deal_nearby':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative min-h-[38px] min-w-[38px] p-2 flex items-center justify-center text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        title="View Notifications"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-emerald-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">
                {isMerchantPersona ? 'Shop Claims & Orders' : 'Deal Alerts Near You'}
              </span>
              {isLoggedIn && unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {isLoggedIn && (
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2 py-1 rounded transition-colors cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {!isLoggedIn ? (
            /* Sign-in Required View */
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-2xs">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  {isMerchantPersona
                    ? 'Sign in to view shop orders'
                    : (t('notifications.loginRequired') || 'Sign in to view notifications')}
                </h4>
                <p className="text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                  {isMerchantPersona
                    ? 'Sign in with your merchant account to track customer claims and M-PESA purchases.'
                    : (t('notifications.loginDesc') || 'Sign in to receive deal alerts near you and live order updates.')}
                </p>
              </div>
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('notifications.signInButton') || 'Sign In / Register'}</span>
              </Link>
            </div>
          ) : (
            <>
              {/* Persona Sub-header & Filter Tabs */}
              <div className="px-3.5 py-2 border-b border-slate-100 bg-white flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">
                  {isMerchantPersona ? 'Merchant Alerts' : 'Customer Alerts'}
                </span>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilter('unread')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      filter === 'unread' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Unread
                  </button>
                </div>
              </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {displayedNotifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {isMerchantPersona ? 'No shop claims or purchases yet.' : 'You are all caught up!'}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
                  {isMerchantPersona
                    ? 'When a customer claims or buys your product with M-PESA, you will be notified here.'
                    : 'When exciting new deals pop up around you in Bole, you will be notified here.'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-slate-50 ${
                    !notif.read ? 'bg-emerald-50/40' : 'bg-white'
                  }`}
                >
                  {renderIcon(notif.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs ${!notif.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(notif.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-1.5">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-2">
                      {notif.link && (
                        <Link
                          href={notif.link}
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notif.id);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          <span>{notif.recipientType === 'merchant' ? 'View Orders' : 'View Deal'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
