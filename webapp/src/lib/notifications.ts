/**
 * Centralized In-Website Notification Service for TirfMarket.
 * Provides on-website notifications for:
 * 1. Merchants: Notifies when a customer claims or buys their product.
 * 2. Customers: Notifies when there is a new deal around them.
 */

export interface WebNotification {
  id: string;
  recipientType: 'merchant' | 'customer' | 'all';
  merchantId?: string; // Optional merchant filter
  type: 'deal_claimed' | 'deal_bought' | 'new_deal_nearby';
  title: string;
  message: string;
  dealId?: string;
  dealTitle?: string;
  merchantName?: string;
  amount?: number;
  discountPct?: number;
  distanceMeters?: number;
  timestamp: string; // ISO date string
  read: boolean;
  link?: string;
}

const STORAGE_KEY = 'tirf_web_notifications';

const SEED_NOTIFICATIONS: WebNotification[] = [
  {
    id: 'notif_seed_merchant_1',
    recipientType: 'merchant',
    merchantId: 'm0000000-0000-0000-0000-000000000001',
    type: 'deal_claimed',
    title: 'New Voucher Claimed',
    message: 'A customer claimed "20% off House Special Tibs with Injera". 1 unit held at counter.',
    dealTitle: '20% off House Special Tibs with Injera',
    merchantName: 'Bole Highland Cafe',
    amount: 320,
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    read: false,
    link: '/dashboard',
  },
  {
    id: 'notif_seed_merchant_2',
    recipientType: 'merchant',
    merchantId: 'm0000000-0000-0000-0000-000000000001',
    type: 'deal_bought',
    title: 'Product Purchased!',
    message: 'Customer bought "Ertib" for 150 ETB via M-Pesa. Voucher ready for counter redemption.',
    dealTitle: 'Ertib',
    merchantName: 'Bole Highland Cafe',
    amount: 150,
    timestamp: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    read: false,
    link: '/dashboard',
  },
  {
    id: 'notif_seed_customer_1',
    recipientType: 'customer',
    type: 'new_deal_nearby',
    title: 'New Deal Around You!',
    message: '25% off Beyaynetu Fasting Platter is now live 180 m away at Addis Vegan Restaurant.',
    dealTitle: '25% off Beyaynetu Fasting Platter',
    merchantName: 'Addis Vegan Restaurant',
    discountPct: 25,
    distanceMeters: 180,
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    read: false,
    link: '/',
  },
  {
    id: 'notif_seed_customer_2',
    recipientType: 'customer',
    type: 'new_deal_nearby',
    title: 'Hot Coffee Offer Nearby',
    message: 'Afternoon Tea & Cake Set is 20% off near Bole Medhanialem (320 m).',
    dealTitle: 'Afternoon Tea & Cake Set',
    merchantName: 'Sunrise Cafe',
    discountPct: 20,
    distanceMeters: 320,
    timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    read: true,
    link: '/',
  },
];

/**
 * Internal helper to read raw notification list from local storage.
 */
export function getRawNotificationList(): WebNotification[] {
  if (typeof window === 'undefined') {
    return SEED_NOTIFICATIONS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NOTIFICATIONS));
      return SEED_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NOTIFICATIONS));
      return SEED_NOTIFICATIONS;
    }
    return parsed;
  } catch {
    return SEED_NOTIFICATIONS;
  }
}

function filterList(
  list: WebNotification[],
  roleFilter: 'merchant' | 'customer' = 'customer',
  merchantId?: string
): WebNotification[] {
  return list.filter((item) => {
    if (roleFilter === 'merchant') {
      // Merchants ONLY receive sales and claim updates
      if (item.recipientType !== 'merchant') return false;
      if (item.type !== 'deal_claimed' && item.type !== 'deal_bought') return false;
      if (merchantId && item.merchantId && item.merchantId !== merchantId) return false;
      return true;
    }
    if (roleFilter === 'customer') {
      // Customers ONLY receive new deal discovery alerts around them
      if (item.recipientType !== 'customer') return false;
      if (item.type !== 'new_deal_nearby') return false;
      return true;
    }
    return false;
  });
}

/**
 * Returns stored notifications, strictly aligned and filtered by user role (merchant or customer).
 * Notifications meant for merchants will never be returned when requesting customer notifications.
 */
export function getNotifications(
  roleFilter: 'merchant' | 'customer' = 'customer',
  merchantId?: string
): WebNotification[] {
  const rawList = getRawNotificationList();
  return filterList(rawList, roleFilter, merchantId);
}

/**
 * Adds a new notification and broadcasts both a storage update event
 * and a real-time toast alert event.
 */
export function addNotification(
  notif: Omit<WebNotification, 'id' | 'timestamp' | 'read'>
): WebNotification {
  const newNotif: WebNotification = {
    ...notif,
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };

  if (typeof window !== 'undefined') {
    try {
      const all = getRawNotificationList();
      const updated = [newNotif, ...all.slice(0, 49)]; // keep latest 50
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Broadcast storage update
      window.dispatchEvent(new Event('tirf_notifications_updated'));

      // Broadcast toast banner event
      window.dispatchEvent(
        new CustomEvent('tirf_notification_toast', { detail: newNotif })
      );
    } catch (err) {
      console.error('Failed to save notification:', err);
    }
  }

  return newNotif;
}

/**
 * Marks a single notification as read.
 */
export function markAsRead(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const all = getRawNotificationList();
    const updated = all.map((n) => (n.id === id ? { ...n, read: true } : n));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('tirf_notifications_updated'));
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
  }
}

/**
 * Marks all notifications as read for a given role or globally.
 */
export function markAllAsRead(roleFilter?: 'merchant' | 'customer'): void {
  if (typeof window === 'undefined') return;

  try {
    const all = getRawNotificationList();
    const updated = all.map((n) => {
      if (!roleFilter || n.recipientType === roleFilter) {
        return { ...n, read: true };
      }
      return n;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('tirf_notifications_updated'));
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err);
  }
}

/**
 * Clears notifications for a specific persona or all.
 */
export function clearNotifications(roleFilter?: 'merchant' | 'customer'): void {
  if (typeof window === 'undefined') return;

  try {
    if (!roleFilter) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } else {
      const all = getRawNotificationList();
      const remaining = all.filter((n) => n.recipientType !== roleFilter);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    }
    window.dispatchEvent(new Event('tirf_notifications_updated'));
  } catch (err) {
    console.error('Failed to clear notifications:', err);
  }
}

// ============================================================================
// CONVENIENCE HELPERS FOR MERCHANT & CUSTOMER NOTIFICATIONS
// ============================================================================

/**
 * Notify merchant that a customer claimed their deal.
 */
export function notifyMerchantDealClaimed(deal: {
  id: string;
  title: string;
  merchantId?: string;
  merchantName: string;
  amount: number;
}): WebNotification {
  return addNotification({
    recipientType: 'merchant',
    merchantId: deal.merchantId,
    type: 'deal_claimed',
    title: 'New Voucher Claimed',
    message: `A customer reserved "${deal.title}". 1 voucher is held at your counter.`,
    dealId: deal.id,
    dealTitle: deal.title,
    merchantName: deal.merchantName,
    amount: deal.amount,
    link: '/dashboard',
  });
}

/**
 * Notify merchant that a customer purchased their deal.
 */
export function notifyMerchantDealBought(deal: {
  id: string;
  title: string;
  merchantId?: string;
  merchantName: string;
  amount: number;
  orderId?: string;
}): WebNotification {
  return addNotification({
    recipientType: 'merchant',
    merchantId: deal.merchantId,
    type: 'deal_bought',
    title: 'Product Purchased!',
    message: `Customer bought "${deal.title}" for ${Math.round(deal.amount)} ETB via M-Pesa. Ready for redemption!`,
    dealId: deal.id,
    dealTitle: deal.title,
    merchantName: deal.merchantName,
    amount: deal.amount,
    link: '/dashboard',
  });
}

/**
 * Notify customer that a new deal is available around them.
 */
export function notifyCustomerNewDealNearby(deal: {
  id: string;
  title: string;
  merchantName: string;
  discountPct?: number;
  finalAmount: number;
  distanceMeters?: number;
}): WebNotification {
  const distStr =
    deal.distanceMeters !== undefined
      ? deal.distanceMeters < 1000
        ? `${Math.round(deal.distanceMeters)} m away`
        : `${(deal.distanceMeters / 1000).toFixed(1)} km away`
      : 'in your area';

  const discountStr = deal.discountPct ? `${deal.discountPct}% OFF` : `${Math.round(deal.finalAmount)} ETB`;

  return addNotification({
    recipientType: 'customer',
    type: 'new_deal_nearby',
    title: 'New Deal Around You!',
    message: `"${deal.title}" is now available at ${deal.merchantName} (${discountStr}, ${distStr}).`,
    dealId: deal.id,
    dealTitle: deal.title,
    merchantName: deal.merchantName,
    discountPct: deal.discountPct,
    amount: deal.finalAmount,
    distanceMeters: deal.distanceMeters,
    link: '/',
  });
}
