export type Language = 'en' | 'am';

export type UserRole = 'customer' | 'merchant' | 'admin';

export type VoucherStatus = 
  | 'reserved' 
  | 'paying' 
  | 'paid' 
  | 'redeemed' 
  | 'expired_hold' 
  | 'expired_pickup' 
  | 'refunded';

export interface Shop {
  id: string;
  name: string;
  nameAm?: string;
  category: 'Café' | 'Bakery' | 'Juice' | 'Books' | 'Barber' | 'Other';
  categoryAm?: string;
  isVerified: boolean;
  isNew?: boolean;
  tinNumber: string;
  tillNumber?: string;
  address: string;
  addressAm?: string;
  distanceMeters: number;
  walkMinutes: number;
  mapCoords: { x: number; y: number }; // Relative coordinates on Bole map 0..100
  photoUrl?: string;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  eTradeVerified?: boolean;
  dealsRedeemedCount: number;
  cashlessSalesTotal: number;
  pendingSalesCount: number;
  failedSalesCount: number;
}

export interface Deal {
  id: string;
  shopId: string;
  shopName: string;
  title: string;
  titleAm?: string;
  description: string;
  descriptionAm?: string;
  originalPrice: number; // whole ETB
  discountPct: number;   // whole percentage (e.g. 20)
  finalPrice: number;    // calculated ceil(originalPrice * (100 - discountPct) / 100)
  unitsTotal: number;
  unitsLeft: number;
  distanceMeters: number;
  walkMinutes: number;
  itemCode: string;      // e.g. SRC-014 (permanent item code)
  category: 'Café' | 'Bakery' | 'Juice' | 'Books' | 'Barber' | 'Other';
  categoryAm?: string;
  expiryHours: number;
  reportCount: number;
  isHidden: boolean;     // Hidden if unitsLeft <= 0 or reportCount >= 3
  createdAt: number;
  themeColor: string;
}

export interface Claim {
  id: string;
  dealId: string;
  shopId: string;
  shopName: string;
  dealTitle: string;
  itemCode: string;
  originalPrice: number;
  discountPct: number;
  finalPrice: number;
  customerPhone: string;
  redemptionCode: string;  // 8 chars, e.g. K7M4Q9XR
  mpesaReceipt?: string;   // e.g. NLJ7RT61SV
  status: VoucherStatus;
  reservedAt: number;      // timestamp
  holdExpiresAt: number;   // reservedAt + 5 min
  paidAt?: number;
  pickupExpiresAt?: number;// paidAt + (walkMinutes + 15 min), clamped between 20 & 120 min
  redeemedAt?: number;
  refundedAt?: number;
}

export interface MerchantSaleRecord {
  id: string;
  dealTitle: string;
  amount: number;
  mpesaReceipt: string;
  redemptionCode: string;
  timestamp: number;
  status: 'paid' | 'redeemed' | 'expired_refund_due' | 'refunded';
}

export interface ReportedDeal {
  dealId: string;
  dealTitle: string;
  shopName: string;
  reason: string;
  reportedAt: number;
  reporterIpOrId: string;
}
