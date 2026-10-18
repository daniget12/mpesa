// Unified Dashboard Data Layer: Switches seamlessly between mock demo mode and live authenticated backend API

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tirfmarket-backend.onrender.com';

// Mock mode is enabled by default unless NEXT_PUBLIC_DASHBOARD_MOCK is explicitly set to 'false'
export function isMockDashboard(): boolean {
  return process.env.NEXT_PUBLIC_DASHBOARD_MOCK !== 'false';
}

// ==========================================
// BACKEND CONTRACT SHAPE
// (Confirmed by API-CONTRACT.md v1.0.0; kept strictly in this one file)
// ==========================================

export interface RecentOrder {
  orderId: string;
  dealTitle: string | null;
  amount: number;
  receipt: string | null;
  paidAt: string;
}

export interface StatsResponse {
  merchantId?: string;
  dealsRedeemed: number;
  cashlessSales: number;
  pending: number;
  failed: number;
  recent: RecentOrder[];
}

// ==========================================
// MAPPED DOMAIN TYPES (Exposed to the Page)
// (The page never reads raw field names directly)
// ==========================================

export interface DashboardOrder {
  orderId: string;
  dealTitle: string; // If raw dealTitle is null, mapped safely to "Deal"
  amount: number;
  receipt: string | null;
  paidAt: string;
}

export interface DashboardStats {
  merchantId: string;
  dealsRedeemed: number;
  cashlessSales: number;
  pending: number;
  failed: number;
  recent: DashboardOrder[];
}

export type MerchantStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface MerchantMe {
  id?: string;
  email?: string;
  name?: string;
  shopName?: string;
  category?: string;
  rejectionReason?: string | null;
  status: MerchantStatus;
  error?: string;
}

export class DashboardApiError extends Error {
  status: number;
  merchantStatus?: MerchantStatus;
  constructor(status: number, message: string, merchantStatus?: MerchantStatus) {
    super(message);
    this.name = 'DashboardApiError';
    this.status = status;
    this.merchantStatus = merchantStatus;
  }
}

/**
 * 15-second request timeout helper for dashboard API calls.
 */
async function fetchWithDashboardTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new DashboardApiError(408, 'Request timed out. The server may be waking up.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ==========================================
// FIELD MAPPING
// (Single source of truth for contract field mapping)
// ==========================================

export function mapStats(raw: Partial<StatsResponse>): DashboardStats {
  const rawRecent = Array.isArray(raw.recent) ? raw.recent : [];
  const recent: DashboardOrder[] = rawRecent.map((o) => ({
    orderId: String(o.orderId || ''),
    // dealTitle can be null: show "Deal" instead of crashing
    dealTitle: (o.dealTitle && typeof o.dealTitle === 'string' && o.dealTitle.trim()) ? o.dealTitle.trim() : 'Deal',
    amount: Number(o.amount || 0),
    receipt: o.receipt ? String(o.receipt) : null,
    paidAt: String(o.paidAt || new Date().toISOString()),
  }));

  const totalCalculatedSales = recent.reduce((sum, item) => sum + item.amount, 0);

  return {
    merchantId: String(raw.merchantId || 'merchant_bole_01'),
    dealsRedeemed: Number(raw.dealsRedeemed ?? recent.length),
    cashlessSales: Number(raw.cashlessSales ?? totalCalculatedSales),
    pending: Number(raw.pending ?? 0),
    failed: Number(raw.failed ?? 0),
    recent,
  };
}

// SessionStorage token management (never logged or printed)
const TOKEN_KEY = 'tm_merchant_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // SessionStorage disabled
  }
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // SessionStorage disabled
  }
}

// ==========================================
// MOCK DATA GENERATOR & STATE
// ==========================================

const SAMPLE_BOLE_DEALS: Array<{ dealTitle: string | null; amount: number }> = [
  { dealTitle: '20% off Specialty Macchiato & Croissant', amount: 144 },
  { dealTitle: '25% off Double Cheeseburger Combo', amount: 260 },
  { dealTitle: '15% off Roasted Coffee Beans (House Blend)', amount: 102 },
  { dealTitle: '20% off Traditional Habesha Kemis Tailoring', amount: 375 },
  { dealTitle: '15% off First Aid & Family Hygiene Kit', amount: 210 },
  { dealTitle: '30% off Haircut, Beard Trim & Hot Towel', amount: 175 },
  { dealTitle: null, amount: 150 }, // Null dealTitle tests that "Deal" is shown without crashing
];

let mockReceiptCounter = 88491204;
const mockPendingCount = 1;
const mockFailedCount = 0;

// Initial sample paid orders at Bole shops
const mockRecentOrders: RecentOrder[] = [
  {
    orderId: 'tm_ord_8f1a01',
    dealTitle: '20% off Specialty Macchiato & Croissant',
    amount: 144,
    receipt: 'MOCK88491201',
    paidAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
  {
    orderId: 'tm_ord_8f1a02',
    dealTitle: '25% off Double Cheeseburger Combo',
    amount: 260,
    receipt: 'MOCK88491202',
    paidAt: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
  },
  {
    orderId: 'tm_ord_8f1a03',
    dealTitle: '15% off Roasted Coffee Beans (House Blend)',
    amount: 102,
    receipt: 'MOCK88491203',
    paidAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  },
  {
    orderId: 'tm_ord_8f1a04',
    dealTitle: null, // Tests that null dealTitle shows "Deal" without crashing
    amount: 150,
    receipt: 'MOCK88491204',
    paidAt: new Date(Date.now() - 1000 * 50).toISOString(),
  },
];

// Adds a new paid order every ~8 seconds for the demo
export function addMockPaidOrder(): void {
  mockReceiptCounter += 1;
  const sample = SAMPLE_BOLE_DEALS[Math.floor(Math.random() * SAMPLE_BOLE_DEALS.length)];
  const randomHex = Math.random().toString(16).substring(2, 8);
  const newOrder: RecentOrder = {
    orderId: `tm_ord_${randomHex}`,
    dealTitle: sample.dealTitle,
    amount: sample.amount,
    receipt: `MOCK${mockReceiptCounter}`,
    paidAt: new Date().toISOString(),
  };

  mockRecentOrders.unshift(newOrder);
  if (mockRecentOrders.length > 50) {
    mockRecentOrders.pop();
  }
}

// Auto-tick timer on client in mock mode
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (isMockDashboard() && !document.hidden) {
      addMockPaidOrder();
    }
  }, 8000);
}

// ==========================================
// AUTHENTICATION API
// ==========================================

/**
 * Requests an email verification code.
 * In both mock and real mode, always resolves cleanly to avoid leaking email existence.
 * 15s timeout.
 */
export async function requestAuthCode(email: string): Promise<{ ok: boolean; message: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isMockDashboard()) {
    return { ok: true, message: 'If this email is registered, a code was sent' };
  }

  try {
    const res = await fetchWithDashboardTimeout(`${BACKEND_URL}/api/merchant/auth/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (res.status === 429) {
      throw new DashboardApiError(429, 'Too many attempts, wait 15 minutes');
    }
    // Backend always answers 200
    return { ok: true, message: 'If this email is registered, a code was sent' };
  } catch (err: unknown) {
    if (err instanceof DashboardApiError) throw err;
    return { ok: true, message: 'If this email is registered, a code was sent' };
  }
}

/**
 * Verifies the 6-digit code and returns { token }.
 * 5 wrong codes returns 429: "Too many attempts, wait 15 minutes".
 * 15s timeout.
 */
export async function verifyAuthCode(
  email: string,
  code: string
): Promise<{ token?: string; error?: string; status?: number }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  if (cleanCode.length !== 6) {
    return { error: 'Please enter a 6-digit code', status: 400 };
  }

  if (isMockDashboard()) {
    const mockToken = 'mock-demo-session-token';
    setStoredToken(mockToken);
    return { token: mockToken };
  }

  try {
    const res = await fetchWithDashboardTimeout(`${BACKEND_URL}/api/merchant/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, code: cleanCode }),
    });

    if (res.status === 429) {
      return { error: 'Too many attempts, wait 15 minutes', status: 429 };
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error: data?.error || 'Invalid verification code. Please try again.',
        status: res.status,
      };
    }

    if (data?.token) {
      setStoredToken(data.token);
      return { token: data.token };
    }

    return { error: 'No token received from verification server', status: 500 };
  } catch (err: unknown) {
    if (err instanceof DashboardApiError) {
      return { error: err.message, status: err.status };
    }
    return { error: 'Network error. Could not connect to verification server.', status: 0 };
  }
}

// ==========================================
// MERCHANT PROFILE & STATUS
// ==========================================

/**
 * Fetches merchant status: 'pending', 'approved', 'rejected', or 'suspended'.
 * 15s timeout.
 */
export async function fetchMerchantMe(token?: string): Promise<MerchantMe> {
  if (isMockDashboard()) {
    return {
      status: 'approved',
      name: 'Bole Highland Cafe',
      email: 'merchant@bolecafe.et',
    };
  }

  const authToken = token || getStoredToken();
  if (!authToken) {
    throw new DashboardApiError(401, 'Unauthorized');
  }

  let res: Response;
  try {
    res = await fetchWithDashboardTimeout(`${BACKEND_URL}/api/merchant/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  } catch (err: unknown) {
    if (err instanceof DashboardApiError) throw err;
    throw new DashboardApiError(0, 'Network error. Please check your connection.');
  }

  if (res.status === 401) {
    clearStoredToken();
    throw new DashboardApiError(401, 'Unauthorized');
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 403) {
    return {
      status: (data.status as MerchantStatus) || 'suspended',
      error: data.error,
      rejectionReason: data.rejectionReason ?? null,
    };
  }

  if (!res.ok) {
    throw new DashboardApiError(res.status, data?.error || `Failed to fetch merchant details (${res.status})`);
  }

  return {
    id: data.id,
    name: data.name,
    shopName: data.shopName || data.name,
    category: data.category,
    rejectionReason: data.rejectionReason ?? null,
    email: data.email,
    status: (data.status as MerchantStatus) || 'approved',
  };
}

// ==========================================
// MERCHANT STATS & TRANSACTIONS
// ==========================================

/**
 * Fetches merchant stats.
 * In mock mode: generates contract shape where cashlessSales equals the sum of order amounts,
 * then maps it through mapStats().
 * In real mode: calls GET /api/merchant/stats with Bearer token (15s timeout), then maps it through mapStats().
 */
export async function fetchDashboardStats(token?: string): Promise<DashboardStats> {
  if (isMockDashboard()) {
    const cashlessSales = mockRecentOrders.reduce((sum, item) => sum + item.amount, 0);
    const raw: StatsResponse = {
      merchantId: 'merchant_bole_highland',
      dealsRedeemed: mockRecentOrders.length,
      cashlessSales,
      pending: mockPendingCount,
      failed: mockFailedCount,
      recent: [...mockRecentOrders],
    };
    return mapStats(raw);
  }

  const authToken = token || getStoredToken();
  if (!authToken) {
    throw new DashboardApiError(401, 'Unauthorized');
  }

  let res: Response;
  try {
    res = await fetchWithDashboardTimeout(`${BACKEND_URL}/api/merchant/stats`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  } catch (err: unknown) {
    if (err instanceof DashboardApiError) throw err;
    throw new DashboardApiError(0, 'Network error. Please check your connection.');
  }

  if (res.status === 401) {
    clearStoredToken();
    throw new DashboardApiError(401, 'Unauthorized');
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 403) {
    throw new DashboardApiError(403, data.error || 'Access denied', data.status as MerchantStatus);
  }

  if (!res.ok) {
    throw new DashboardApiError(res.status, data?.error || `Failed to fetch merchant stats (${res.status})`);
  }

  return mapStats(data as StatsResponse);
}

// ==========================================
// REDEEM VOUCHER CODE API
// ==========================================

export interface RedeemResponse {
  orderId: string;
  dealTitle: string;
  itemCode?: string | null;
  amount: number;
  redeemedAt: string;
  isSample?: boolean;
}

interface MockRedeemRecord {
  orderId: string;
  dealTitle: string;
  itemCode?: string | null;
  amount: number;
  redeemed: boolean;
  redeemedAt?: string;
}

const mockRedemptionStore: Record<string, MockRedeemRecord> = {
  'SAMPLE-ORD-01': {
    orderId: 'tm_ord_8f1a01',
    dealTitle: '20% off Specialty Macchiato & Croissant',
    itemCode: 'COFFEE-01',
    amount: 144,
    redeemed: false,
  },
  'SAMPLE-ORD-02': {
    orderId: 'tm_ord_8f1a02',
    dealTitle: '25% off Double Cheeseburger Combo',
    itemCode: 'BURGER-02',
    amount: 260,
    redeemed: false,
  },
  'SAMPLE-ORD-03': {
    orderId: 'tm_ord_8f1a03',
    dealTitle: '15% off Roasted Coffee Beans (House Blend)',
    itemCode: null,
    amount: 102,
    redeemed: false,
  },
  'TIRF-8F1A01': {
    orderId: 'tm_ord_8f1a01',
    dealTitle: '20% off Specialty Macchiato & Croissant',
    itemCode: 'COFFEE-01',
    amount: 144,
    redeemed: false,
  },
  'TIRF-8F1A02': {
    orderId: 'tm_ord_8f1a02',
    dealTitle: '25% off Double Cheeseburger Combo',
    itemCode: 'BURGER-02',
    amount: 260,
    redeemed: false,
  },
};

const mockDynamicRedeemedCodes = new Set<string>();

/**
 * Redeems a customer voucher code.
 * In mock mode: works against sample codes generated with sample orders without calling network,
 * returning 409 on second use of same code.
 * In real mode: calls POST /api/merchant/redeem with Bearer token (15s timeout).
 */
export async function redeemDealCode(code: string, token?: string): Promise<RedeemResponse> {
  const cleanCode = String(code || '').trim().toUpperCase();

  if (!cleanCode) {
    throw new DashboardApiError(400, 'Please enter a redemption code');
  }

  if (isMockDashboard()) {
    // Artificial latency for tactile UI response
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Check predefined sample records
    if (cleanCode in mockRedemptionStore) {
      const record = mockRedemptionStore[cleanCode];
      if (record.redeemed) {
        throw new DashboardApiError(409, 'This code was already used');
      }
      record.redeemed = true;
      record.redeemedAt = new Date().toISOString();
      return {
        orderId: record.orderId,
        dealTitle: record.dealTitle,
        itemCode: record.itemCode ?? null,
        amount: record.amount,
        redeemedAt: record.redeemedAt,
        isSample: true,
      };
    }

    // Check dynamic sample codes starting with SAMPLE or TIRF
    if (cleanCode.startsWith('SAMPLE') || cleanCode.startsWith('TIRF')) {
      if (mockDynamicRedeemedCodes.has(cleanCode)) {
        throw new DashboardApiError(409, 'This code was already used');
      }
      mockDynamicRedeemedCodes.add(cleanCode);
      return {
        orderId: 'tm_ord_' + Math.random().toString(16).substring(2, 8),
        dealTitle: 'Specialty Coffee & Pastry',
        itemCode: null,
        amount: 160,
        redeemedAt: new Date().toISOString(),
        isSample: true,
      };
    }

    // Unrecognized code in mock mode
    throw new DashboardApiError(404, 'Code not found for this shop');
  }

  // Real Mode: Requires Bearer authentication
  const authToken = token || getStoredToken();
  if (!authToken) {
    clearStoredToken();
    throw new DashboardApiError(401, 'Unauthorized');
  }

  let res: Response;
  try {
    res = await fetchWithDashboardTimeout(`${BACKEND_URL}/api/merchant/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ code: cleanCode }),
    });
  } catch (err: unknown) {
    if (err instanceof DashboardApiError) throw err;
    throw new DashboardApiError(0, 'Network error. Please check your connection and retry.');
  }

  if (res.status === 401) {
    clearStoredToken();
    throw new DashboardApiError(401, 'Unauthorized');
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 404) {
    throw new DashboardApiError(404, data?.error || 'Code not found for this shop');
  }

  if (res.status === 409) {
    throw new DashboardApiError(409, data?.error || 'This code was already used');
  }

  if (!res.ok) {
    throw new DashboardApiError(res.status, data?.error || 'Failed to redeem code. Please try again.');
  }

  return {
    orderId: String(data.orderId || ''),
    dealTitle: String(data.dealTitle || 'Deal'),
    itemCode: data.itemCode ?? null,
    amount: Number(data.amount || 0),
    redeemedAt: String(data.redeemedAt || new Date().toISOString()),
    isSample: false,
  };
}
