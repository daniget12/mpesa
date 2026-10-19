// TirfMarket API Client: Connects the Next.js frontend to the Express M-PESA Backend

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tirfmarket-backend.onrender.com';

export interface Order {
  id: string;
  dealId: string;
  merchantId: string;
  amount: number;
  status: 'created' | 'pending' | 'paid' | 'failed';
  checkoutRequestId?: string;
  mpesaReceipt?: string;
  paidAmount?: number;
  redemptionCode?: string;
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
  itemCode?: string | null;
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
 * Helper to fetch with an AbortController timeout.
 * Throws an ApiError with status 408 on timeout.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 60000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(408, 'Request timed out. The server may be waking up.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checks backend health and mode ('mock' vs 'sandbox').
 * 60s timeout for cold start.
 */
export async function getBackendHealth(): Promise<BackendHealth> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/health`, {}, 60000);
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
 * 60s timeout for cold start.
 */
export async function createOrder(dealId: string, phone: string): Promise<Order> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${BACKEND_URL}/api/orders`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, phone }),
      },
      60000
    );
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
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
    if (res.status === 409) {
      throw new ApiError(409, (data?.message as string) || (data?.error as string) || 'payment_in_progress', data);
    }
    if (res.status === 429) {
      throw new ApiError(429, 'Please wait a moment and try again', data);
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
 * 15s timeout per poll.
 */
export async function getOrderStatus(orderId: string): Promise<Order> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${BACKEND_URL}/api/orders/${encodeURIComponent(orderId)}`, {}, 15000);
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'Network error. Could not reach server.');
  }

  let data: { error?: string; [key: string]: unknown } | null = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new ApiError(429, 'Please wait a moment and try again', data);
    }
    throw new ApiError(res.status, data?.error || `Failed to fetch order status (${res.status})`, data);
  }

  return data as unknown as Order;
}

/**
 * Hyperlocal deal search within radius (meters).
 * 60s timeout for cold start.
 */
export async function fetchNearbyDeals(lat: number, lon: number, radius: number = 2000): Promise<NearbyDeal[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius: radius.toString(),
  });

  const res = await fetchWithTimeout(`${BACKEND_URL}/api/deals/nearby?${params.toString()}`, {}, 60000);
  if (!res.ok) {
    throw new ApiError(res.status, 'Failed to fetch nearby deals');
  }
  return res.json();
}

/**
 * Instant pitch-day test override (forces paid or failed immediately).
 * 15s timeout.
 */
export async function forceMockResult(orderId: string, outcome: 'paid' | 'failed'): Promise<Order> {
  const res = await fetchWithTimeout(
    `${BACKEND_URL}/api/orders/${encodeURIComponent(orderId)}/mock-result`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    },
    15000
  );
  return res.json();
}

/**
 * Checks whether merchant registration is in mock mode (default "true").
 * Only "false" performs live network requests.
 */
export function isMockRegister(): boolean {
  return process.env.NEXT_PUBLIC_REGISTER_MOCK !== 'false';
}

export interface MerchantRegisterPayload {
  shopName: string;
  ownerName: string;
  licenseNumber: string;
  tinNumber: string;
  email: string;
  ownerPhone: string;
  mpesaPhone: string;
  category: string;
  lat: number;
  lon: number;
  photo: string;
  tillNumber?: string;
}

export interface MerchantRegisterResponse {
  merchantId: string;
  status: 'pending';
}

/**
 * Registers a new shop merchant (POST /api/merchants/register).
 * Timeout: 60 seconds (cold-start mitigation).
 * Never logs request payload or credentials.
 */
export async function registerMerchant(
  payload: MerchantRegisterPayload
): Promise<MerchantRegisterResponse> {
  if (isMockRegister()) {
    // Artificial natural latency for local demo
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      merchantId: 'mock-mid-' + Math.random().toString(36).substring(2, 10),
      status: 'pending',
    };
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${BACKEND_URL}/api/merchants/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      60000
    );
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
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
      throw new ApiError(400, data?.error || 'Validation error. Please verify all fields.', data);
    }
    if (res.status === 409) {
      throw new ApiError(409, 'A shop with these details already exists. Contact support if this is yours.', data);
    }
    if (res.status === 429) {
      throw new ApiError(429, 'Too many attempts, try again in an hour', data);
    }
    if (res.status === 500) {
      throw new ApiError(500, data?.error || 'Failed to process registration. Please retry.', data);
    }
    throw new ApiError(res.status, data?.error || `Request failed with status ${res.status}`, data);
  }

  return data as unknown as MerchantRegisterResponse;
}

