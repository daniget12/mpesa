export interface CustomerClaimTicket {
  id: string; // Order ID or Claim ID
  orderId: string;
  dealId: string;
  dealTitle: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  originalPrice?: number;
  discountPct?: number;
  redemptionCode: string;
  receipt?: string | null;
  status: 'paid' | 'redeemed';
  paidAt: string; // ISO date string
  phone?: string;
  itemCode?: string | null;
  rating?: number; // 1 to 5 stars
  reviewComment?: string;
  reviewedAt?: string;
}

const STORAGE_KEY = 'tirf_customer_claims';

const SEED_CLAIMS: CustomerClaimTicket[] = [
  {
    id: 'claim_sample_1',
    orderId: 'tm_ord_8f1a01',
    dealId: 'd0000000-0000-0000-0000-000000000001',
    dealTitle: '20% off Specialty Macchiato & Croissant',
    merchantId: 'm0000000-0000-0000-0000-000000000001',
    merchantName: 'Bole Highland Cafe',
    amount: 144,
    originalPrice: 180,
    discountPct: 20,
    redemptionCode: 'TIRF-8F1A01',
    receipt: 'NLJ7RT61SV',
    status: 'paid',
    paidAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    phone: '0911223344',
    itemCode: 'COFFEE-01',
  },
  {
    id: 'claim_sample_2',
    orderId: 'tm_ord_8f1a02',
    dealId: 'd0000000-0000-0000-0000-000000000002',
    dealTitle: 'Fresh Sourdough Rolls (Pack of 6)',
    merchantId: 'm0000000-0000-0000-0000-000000000002',
    merchantName: 'Kebero Bakery',
    amount: 90,
    originalPrice: 120,
    discountPct: 25,
    redemptionCode: 'K7M4Q9XR',
    receipt: 'NLJ9QP41BM',
    status: 'redeemed',
    paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    phone: '0911223344',
    itemCode: 'KBR-002',
    rating: 5,
    reviewComment: 'Crisp sourdough and lovely warm service! Redeemed in under 30 seconds at the counter.',
    reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Returns all saved customer claims from localStorage, seeding with realistic sample
 * claims on first visit.
 */
export function getCustomerClaimTickets(): CustomerClaimTicket[] {
  if (typeof window === 'undefined') return SEED_CLAIMS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CLAIMS));
      return SEED_CLAIMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CLAIMS));
    return SEED_CLAIMS;
  } catch {
    return SEED_CLAIMS;
  }
}

/**
 * Saves a new claim ticket when a user completes payment.
 * Automatically prepends to the list to display newest first.
 */
export function saveCustomerClaimTicket(ticket: CustomerClaimTicket): void {
  if (typeof window === 'undefined') return;

  try {
    const list = getCustomerClaimTickets();
    // Avoid exact duplicate IDs
    const filtered = list.filter((t) => t.id !== ticket.id && t.orderId !== ticket.orderId);
    const updated = [ticket, ...filtered];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('tirf_claims_updated'));
  } catch (err) {
    console.error('Failed to save claim ticket to localStorage:', err);
  }
}

/**
 * Updates 1-to-5 star rating and written review on a specific claim ticket.
 */
export function updateClaimTicketReview(
  ticketId: string,
  rating: number,
  comment: string
): CustomerClaimTicket | null {
  if (typeof window === 'undefined') return null;

  try {
    const list = getCustomerClaimTickets();
    let updatedTicket: CustomerClaimTicket | null = null;

    const updated = list.map((ticket) => {
      if (ticket.id === ticketId || ticket.orderId === ticketId) {
        updatedTicket = {
          ...ticket,
          rating: Math.min(Math.max(rating, 1), 5),
          reviewComment: comment.trim(),
          reviewedAt: new Date().toISOString(),
        };
        return updatedTicket;
      }
      return ticket;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('tirf_claims_updated'));
    return updatedTicket;
  } catch (err) {
    console.error('Failed to update review in localStorage:', err);
    return null;
  }
}

/**
 * Marks a claim ticket as redeemed upon counter checkout.
 */
export function markClaimTicketRedeemed(ticketId: string): CustomerClaimTicket | null {
  if (typeof window === 'undefined') return null;

  try {
    const list = getCustomerClaimTickets();
    let updatedTicket: CustomerClaimTicket | null = null;

    const updated = list.map((ticket) => {
      if (ticket.id === ticketId || ticket.orderId === ticketId) {
        updatedTicket = {
          ...ticket,
          status: 'redeemed' as const,
        };
        return updatedTicket;
      }
      return ticket;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('tirf_claims_updated'));
    return updatedTicket;
  } catch (err) {
    console.error('Failed to mark claim as redeemed in localStorage:', err);
    return null;
  }
}
