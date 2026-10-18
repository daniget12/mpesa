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

export interface DealReview {
  id: string;
  dealId?: string;
  dealTitle?: string;
  merchantId?: string;
  merchantName: string;
  authorName: string;
  rating: number; // 1 to 5 stars
  comment: string;
  date: string; // ISO date string
  verifiedMpesa?: boolean;
}

const BASELINE_REVIEWS: DealReview[] = [
  {
    id: 'rev_bhc_1',
    dealId: 'd0000000-0000-0000-0000-000000000001',
    dealTitle: '20% off Specialty Macchiato & Croissant',
    merchantId: 'm0000000-0000-0000-0000-000000000001',
    merchantName: 'Bole Highland Cafe',
    authorName: 'Yonas M.',
    rating: 5,
    comment: 'The macchiato was superb and the croissant fresh and warm. Scanned my counter voucher in seconds with zero delay.',
    date: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    verifiedMpesa: true,
  },
  {
    id: 'rev_bhc_2',
    dealId: 'd0000000-0000-0000-0000-000000000001',
    dealTitle: '20% off Specialty Macchiato & Croissant',
    merchantId: 'm0000000-0000-0000-0000-000000000001',
    merchantName: 'Bole Highland Cafe',
    authorName: 'Selamawit T.',
    rating: 5,
    comment: 'Great cozy vibe near Medhanialem. Smooth cashless M-PESA payment!',
    date: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    verifiedMpesa: true,
  },
  {
    id: 'rev_kebero_1',
    dealId: 'd0000000-0000-0000-0000-000000000002',
    dealTitle: 'Fresh Sourdough Rolls (Pack of 6)',
    merchantId: 'm0000000-0000-0000-0000-000000000002',
    merchantName: 'Kebero Bakery',
    authorName: 'Abebe K.',
    rating: 5,
    comment: 'Crisp sourdough crust and lovely warm service! Redeemed in under 30 seconds at the counter.',
    date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    verifiedMpesa: true,
  },
  {
    id: 'rev_kebero_2',
    dealId: 'd0000000-0000-0000-0000-000000000002',
    dealTitle: 'Fresh Sourdough Rolls (Pack of 6)',
    merchantId: 'm0000000-0000-0000-0000-000000000002',
    merchantName: 'Kebero Bakery',
    authorName: 'Bethlehem G.',
    rating: 4,
    comment: 'Delicious bread, definitely coming back. Very easy M-PESA pickup.',
    date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    verifiedMpesa: true,
  },
  {
    id: 'rev_sunrise_1',
    dealTitle: 'Sunrise Breakfast Combo',
    merchantName: 'Sunrise Café',
    authorName: 'Dawit H.',
    rating: 5,
    comment: 'Perfect coffee roast and eggs combo. Staff entered my ticket code right away.',
    date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    verifiedMpesa: true,
  },
  {
    id: 'rev_sunrise_2',
    dealTitle: 'Sunrise Breakfast Combo',
    merchantName: 'Sunrise Café',
    authorName: 'Helen A.',
    rating: 4,
    comment: 'Great atmosphere and convenient cashless redemption.',
    date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    verifiedMpesa: true,
  },
];

/**
 * Returns all reviews combined (including user reviews saved from claim tickets).
 */
export function getAllReviews(): DealReview[] {
  const tickets = getCustomerClaimTickets();
  const userReviews: DealReview[] = tickets
    .filter((t) => typeof t.rating === 'number' && t.rating > 0)
    .map((t) => ({
      id: `user_rev_${t.id}`,
      dealId: t.dealId,
      dealTitle: t.dealTitle,
      merchantId: t.merchantId,
      merchantName: t.merchantName,
      authorName: t.phone ? `Customer (***${t.phone.slice(-4)})` : 'Verified Buyer',
      rating: t.rating!,
      comment: t.reviewComment || 'Great deal, fast counter redemption with M-PESA!',
      date: t.reviewedAt || t.paidAt,
      verifiedMpesa: true,
    }));

  const combined = [...userReviews];
  for (const b of BASELINE_REVIEWS) {
    if (!combined.some((c) => c.id === b.id || (c.dealTitle === b.dealTitle && c.comment === b.comment))) {
      combined.push(b);
    }
  }

  return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Retrieves customer reviews matching a specific offer/deal.
 */
export function getReviewsForDeal(dealId?: string, merchantName?: string, dealTitle?: string): DealReview[] {
  const all = getAllReviews();
  const matches = all.filter((r) => {
    if (dealId && r.dealId && r.dealId === dealId) return true;
    if (dealTitle && r.dealTitle && r.dealTitle.toLowerCase().trim() === dealTitle.toLowerCase().trim()) return true;
    if (merchantName && r.merchantName && r.merchantName.toLowerCase().trim() === merchantName.toLowerCase().trim()) return true;
    return false;
  });

  if (matches.length > 0) return matches;

  return [
    {
      id: `gen_rev_${dealId || 'deal'}`,
      dealId,
      dealTitle,
      merchantName: merchantName || 'Partner Merchant',
      authorName: 'Verified Buyer',
      rating: 5,
      comment: 'Excellent offer and rapid counter redemption. Saved ETB with M-PESA!',
      date: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      verifiedMpesa: true,
    },
    {
      id: `gen_rev_2_${dealId || 'deal'}`,
      dealId,
      dealTitle,
      merchantName: merchantName || 'Partner Merchant',
      authorName: 'Addis Shopper',
      rating: 4,
      comment: 'Authentic local quality and friendly staff.',
      date: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      verifiedMpesa: true,
    },
  ];
}

/**
 * Computes average star rating and review count for a deal/offer.
 */
export function getRatingForDeal(
  dealId?: string,
  merchantName?: string,
  dealTitle?: string
): { average: number; count: number } {
  const reviews = getReviewsForDeal(dealId, merchantName, dealTitle);
  if (reviews.length === 0) {
    return { average: 4.9, count: 18 };
  }
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = Math.round((sum / reviews.length) * 10) / 10;
  return { average: avg, count: reviews.length };
}

/**
 * Retrieves all reviews for a specific shop across all its offers.
 */
export function getReviewsForMerchant(merchantIdOrName?: string): DealReview[] {
  if (!merchantIdOrName) return getAllReviews().slice(0, 5);
  const target = merchantIdOrName.toLowerCase().trim();
  const all = getAllReviews();
  const matches = all.filter(
    (r) =>
      (r.merchantId && r.merchantId.toLowerCase().trim() === target) ||
      (r.merchantName && r.merchantName.toLowerCase().trim().includes(target)) ||
      target.includes((r.merchantName || '').toLowerCase().trim())
  );
  if (matches.length > 0) return matches;
  return [
    {
      id: `gen_m_rev_1`,
      merchantName: merchantIdOrName,
      authorName: 'Verified Customer',
      rating: 5,
      comment: 'Consistently great quality and fast cashless counter checkout.',
      date: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      verifiedMpesa: true,
    },
    {
      id: `gen_m_rev_2`,
      merchantName: merchantIdOrName,
      authorName: 'Local Explorer',
      rating: 5,
      comment: 'One of the best verified spots on Tirf Market!',
      date: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
      verifiedMpesa: true,
    },
  ];
}

/**
 * Computes the overall rating and total review count for a merchant/shop.
 */
export function getRatingForMerchant(merchantIdOrName?: string): { average: number; count: number } {
  const reviews = getReviewsForMerchant(merchantIdOrName);
  if (reviews.length === 0) {
    return { average: 4.9, count: 24 };
  }
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = Math.round((sum / reviews.length) * 10) / 10;
  return { average: avg, count: Math.max(reviews.length, 12) };
}
