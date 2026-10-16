// TirfMarket API Client: Connects the Next.js frontend to the Express M-PESA Backend

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export interface Order {
  id: string;
  dealId: string;
  merchantId: string;
  phone: string;
  amount: number;
  status: 'created' | 'pending' | 'paid' | 'failed';
  checkoutRequestId?: string;
  mpesaReceipt?: string;
  paidAmount?: number;
  failureReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NearbyDeal {
  dealId: string;
  title: string;
  description?: string;
  category: string;
  price: number;
  discountPct: number;
  finalAmount: number;
  merchantId: string;
  merchantName: string;
  location?: string;
  image?: string;
  lat: number;
  lon: number;
  distanceMeters: number;
}

export interface MerchantStats {
  dealsRedeemed: number;
  cashlessSales: number;
  pending: number;
  failed: number;
  recent: Array<{
    id: string;
    amount: number;
    status: string;
    phone: string;
    mpesaReceipt?: string;
    createdAt: string;
  }>;
}

/**
 * Initiates an M-PESA STK Push checkout request.
 */
export async function createOrder(dealId: string, phone: string): Promise<Order> {
  const res = await fetch(`${BACKEND_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealId, phone }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to initiate M-PESA payment request');
  }
  return data;
}

/**
 * Polls the current status of an ongoing order.
 */
export async function getOrderStatus(orderId: string): Promise<Order> {
  const res = await fetch(`${BACKEND_URL}/api/orders/${encodeURIComponent(orderId)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch order status');
  }
  return data;
}

/**
 * Hyperlocal deal search within radius (meters).
 */
export async function fetchNearbyDeals(lat: number, lon: number, radius: number = 2000): Promise<NearbyDeal[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius: radius.toString(),
  });

  const res = await fetch(`${BACKEND_URL}/api/deals/nearby?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to fetch nearby deals');
  }
  return res.json();
}

/**
 * Fetches merchant cashless sales and redemptions stats.
 */
export async function fetchMerchantStats(merchantId: string): Promise<MerchantStats> {
  const res = await fetch(`${BACKEND_URL}/api/merchants/${encodeURIComponent(merchantId)}/stats`);
  if (!res.ok) {
    throw new Error('Failed to fetch merchant stats');
  }
  return res.json();
}

/**
 * Instant pitch-day test override (forces paid or failed immediately).
 */
export async function forceMockResult(orderId: string, outcome: 'paid' | 'failed'): Promise<Order> {
  const res = await fetch(`${BACKEND_URL}/api/orders/${encodeURIComponent(orderId)}/mock-result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome }),
  });
  return res.json();
}
