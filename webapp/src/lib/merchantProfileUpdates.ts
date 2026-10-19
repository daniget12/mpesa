/**
 * Merchant Profile Updates Service
 * Handles merchant profile edit requests requiring Administrator approval before going live.
 */

export interface MerchantProfileUpdate {
  id: string;
  merchantId: string;
  merchantEmail?: string;
  currentShopName: string;
  proposedShopName: string;
  category: string;
  address: string;
  contactPhone: string;
  tinNumber?: string;
  tillNumber?: string;
  mapCoords?: { x: number; y: number };
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

const UPDATES_KEY = 'tm_merchant_profile_updates';
const APPROVED_PROFILES_KEY = 'tm_approved_merchant_profiles';

const INITIAL_UPDATES: MerchantProfileUpdate[] = [
  {
    id: 'upd_seed_1',
    merchantId: 'm0000000-0000-0000-0000-000000000001',
    merchantEmail: 'merchant@bolecafe.et',
    currentShopName: 'Bole Highland Cafe',
    proposedShopName: 'Bole Highland Cafe & Roastery',
    category: 'Café',
    address: 'Bole Medhanialem, Behind Edna Mall, 2nd Floor, Addis Ababa',
    contactPhone: '+251 911 234567',
    tinNumber: '0019283746',
    tillNumber: '884920',
    mapCoords: { x: 52, y: 48 },
    description: 'Expanded roastery offering freshly roasted Ethiopian single-origin specialty beans and breakfast bakery.',
    status: 'pending',
    submittedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
];

export function getStoredProfileUpdates(): MerchantProfileUpdate[] {
  if (typeof window === 'undefined') return INITIAL_UPDATES;
  try {
    const raw = localStorage.getItem(UPDATES_KEY);
    if (!raw) {
      localStorage.setItem(UPDATES_KEY, JSON.stringify(INITIAL_UPDATES));
      return INITIAL_UPDATES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_UPDATES;
  } catch {
    return INITIAL_UPDATES;
  }
}

export function saveProfileUpdates(updates: MerchantProfileUpdate[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(UPDATES_KEY, JSON.stringify(updates));
    window.dispatchEvent(new Event('tirf_merchant_updates_changed'));
  } catch (err) {
    console.error('Failed to save profile updates:', err);
  }
}

export function getPendingMerchantProfileUpdates(): MerchantProfileUpdate[] {
  return getStoredProfileUpdates().filter((u) => u.status === 'pending');
}

export function getPendingUpdateForMerchant(merchantIdOrEmail?: string): MerchantProfileUpdate | null {
  if (!merchantIdOrEmail) return null;
  const list = getPendingMerchantProfileUpdates();
  return (
    list.find(
      (u) =>
        u.merchantId === merchantIdOrEmail ||
        (u.merchantEmail && u.merchantEmail.toLowerCase() === merchantIdOrEmail.toLowerCase())
    ) || null
  );
}

export function submitMerchantProfileUpdate(
  data: Omit<MerchantProfileUpdate, 'id' | 'status' | 'submittedAt'>
): MerchantProfileUpdate {
  const updates = getStoredProfileUpdates();
  
  // Replace existing pending update if any
  const filtered = updates.filter(
    (u) =>
      !(
        (u.merchantId === data.merchantId ||
          (u.merchantEmail && data.merchantEmail && u.merchantEmail.toLowerCase() === data.merchantEmail.toLowerCase())) &&
        u.status === 'pending'
      )
  );

  const newUpdate: MerchantProfileUpdate = {
    ...data,
    id: `upd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  filtered.unshift(newUpdate);
  saveProfileUpdates(filtered);

  return newUpdate;
}

export function approveMerchantProfileUpdate(updateId: string): MerchantProfileUpdate | null {
  const updates = getStoredProfileUpdates();
  let approvedRecord: MerchantProfileUpdate | null = null;

  const updatedList = updates.map((u) => {
    if (u.id === updateId) {
      approvedRecord = {
        ...u,
        status: 'approved' as const,
        reviewedAt: new Date().toISOString(),
      };
      return approvedRecord;
    }
    return u;
  });

  if (approvedRecord) {
    saveProfileUpdates(updatedList);

    // Save into approved profiles cache
    if (typeof window !== 'undefined') {
      try {
        const approvedMap = getApprovedProfilesMap();
        const record = approvedRecord as MerchantProfileUpdate;
        approvedMap[record.merchantId] = record;
        if (record.merchantEmail) {
          approvedMap[record.merchantEmail.toLowerCase()] = record;
        }
        localStorage.setItem(APPROVED_PROFILES_KEY, JSON.stringify(approvedMap));
        window.dispatchEvent(new Event('tirf_approved_merchant_changed'));
      } catch (err) {
        console.error('Failed to cache approved profile:', err);
      }
    }
  }

  return approvedRecord;
}

export function rejectMerchantProfileUpdate(updateId: string, reason?: string): MerchantProfileUpdate | null {
  const updates = getStoredProfileUpdates();
  let rejectedRecord: MerchantProfileUpdate | null = null;

  const updatedList = updates.map((u) => {
    if (u.id === updateId) {
      rejectedRecord = {
        ...u,
        status: 'rejected' as const,
        reviewedAt: new Date().toISOString(),
        rejectionReason: reason || 'Information could not be verified by compliance.',
      };
      return rejectedRecord;
    }
    return u;
  });

  if (rejectedRecord) {
    saveProfileUpdates(updatedList);
  }

  return rejectedRecord;
}

export function getApprovedProfilesMap(): Record<string, MerchantProfileUpdate> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(APPROVED_PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getApprovedMerchantProfile(merchantIdOrEmail?: string): MerchantProfileUpdate | null {
  if (!merchantIdOrEmail) return null;
  const map = getApprovedProfilesMap();
  return map[merchantIdOrEmail] || map[merchantIdOrEmail.toLowerCase()] || null;
}
