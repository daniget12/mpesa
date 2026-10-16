// TirfMarket API Client: Connects the Next.js frontend to the Express M-PESA Backend

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tirfmarket-backend.onrender.com';

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
  verified?: boolean;
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

export interface BackendHealth {
  ok: boolean;
  mode: string;
  store: string;
}

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Strips whitespace and hyphens from phone numbers.
 */
export function sanitizePhone(input: string): string {
  return String(input || '').trim().replace(/[\s-]/g, '');
}

/**
 * Validates Ethiopian mobile number formats:
 * - 07xxxxxxxx (10 digits)
 * - 09xxxxxxxx (10 digits)
 * - +2517xxxxxxx (13 chars)
 * - +2519xxxxxxx (13 chars)
 * - 002517xxxxxxx (14 chars)
 * - 002519xxxxxxx (14 chars)
 * - 12 digits starting with 2517 or 2519
 */
export function isValidEthiopianPhone(input: string): boolean {
  const p = sanitizePhone(input);
  return /^(?:0[79]\d{8}|\+251[79]\d{8}|00251[79]\d{8}|251[79]\d{8})$/.test(p);
}

/**
 * Checks backend health and mode ('mock' vs 'sandbox').
 */
export async function getBackendHealth(): Promise<BackendHealth> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    if (!res.ok) {
      throw new ApiError(res.status, `Health check failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'Network error. Could not reach backend.');
  }
}

/**
 * Initiates an M-PESA STK Push checkout request.
 * Sends { dealId, phone } ONLY. Never sends an amount.
 */
export async function createOrder(dealId: string, phone: string): Promise<Order> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId, phone }),
    });
  } catch {
    throw new ApiError(0, 'Network error. Please check your internet connection.');
  }

  let data: { error?: string; [key: string]: unknown } | null = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    if (res.status === 400) {
      throw new ApiError(400, data?.error || 'Invalid phone number. Use 07xxxxxxxx or 09xxxxxxxx.', data);
    }
    if (res.status === 404) {
      throw new ApiError(404, 'Deal no longer available', data);
    }
    if (res.status === 429) {
      throw new ApiError(429, 'Too many attempts, wait a minute', data);
    }
    if (res.status === 502) {
      throw new ApiError(502, data?.error || 'Payment service unavailable. Please retry.', data);
    }
    throw new ApiError(res.status, data?.error || `Request failed with status ${res.status}`, data);
  }

  return data as unknown as Order;
}

/**
 * Polls the current status of an ongoing order.
 */
export async function getOrderStatus(orderId: string): Promise<Order> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/orders/${encodeURIComponent(orderId)}`);
  } catch {
    throw new ApiError(0, 'Network error. Could not reach server.');
  }

  let data: { error?: string; [key: string]: unknown } | null = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Failed to fetch order status (${res.status})`, data);
  }

  return data as unknown as Order;
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

