// Merchant Password Authentication & Persistence Layer
// TirfMarket v1.1.2

import { getStoredToken, setStoredToken, isMockDashboard } from '@/lib/dashboardApi';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const ACCOUNTS_STORAGE_KEY = 'tm_merchant_accounts';
const TOKEN_PREFIX = 'tm_merchant_jwt_';

export interface MerchantAccountRecord {
  email: string;
  passwordHash: string;
  salt: string;
  shopName?: string;
  updatedAt: string;
}

/**
 * Normalizes email strings to avoid casing or whitespace mismatches.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Safe localStorage reader.
 */
function readStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safe localStorage writer.
 */
function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage might be blocked or full
  }
}

/**
 * Generates a random cryptographic salt.
 */
function generateSalt(): string {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 18);
}

/**
 * Computes a SHA-256 hash of salt + password.
 */
async function hashPassword(password: string, salt: string): Promise<string> {
  const combined = `${salt}:${password}`;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Non-browser or fallback hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Retrieves all registered merchant accounts from local storage.
 */
export function getAllMerchantAccounts(): Record<string, MerchantAccountRecord> {
  return readStorage<Record<string, MerchantAccountRecord>>(ACCOUNTS_STORAGE_KEY, {});
}

/**
 * Saves a persistent backend JWT token for a specific merchant email.
 */
export function saveMerchantToken(email: string, token: string): void {
  if (typeof window === 'undefined') return;
  const key = `${TOKEN_PREFIX}${normalizeEmail(email)}`;
  try {
    localStorage.setItem(key, token);
  } catch {
    // Storage disabled
  }
  setStoredToken(token);
}

/**
 * Retrieves a saved backend JWT token for a merchant email.
 */
export function getSavedMerchantToken(email: string): string | null {
  if (typeof window === 'undefined') return null;
  const key = `${TOKEN_PREFIX}${normalizeEmail(email)}`;
  try {
    return localStorage.getItem(key) || getStoredToken();
  } catch {
    return null;
  }
}

/**
 * Checks if a merchant account has already set a password.
 */
export function hasMerchantPassword(email: string): boolean {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return false;
  const accounts = getAllMerchantAccounts();
  return Boolean(accounts[cleanEmail]?.passwordHash);
}

/**
 * Sets or creates a password for a merchant account.
 */
export async function setMerchantPassword(
  email: string,
  password: string,
  shopName?: string,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'A valid email address is required.' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  try {
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const accounts = getAllMerchantAccounts();

    accounts[cleanEmail] = {
      email: cleanEmail,
      passwordHash,
      salt,
      shopName: shopName || accounts[cleanEmail]?.shopName || '',
      updatedAt: new Date().toISOString(),
    };

    writeStorage(ACCOUNTS_STORAGE_KEY, accounts);

    // If an auth token was provided, persist it for this merchant
    if (token) {
      saveMerchantToken(cleanEmail, token);
    } else {
      const existingToken = getSavedMerchantToken(cleanEmail);
      if (existingToken) {
        setStoredToken(existingToken);
      }
    }

    // If Supabase is enabled, attempt syncing to Supabase Auth as seller
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              account_type: 'seller',
              shop_name: shopName || 'Merchant Shop',
            },
          },
        });
      } catch (sbErr) {
        console.warn('Supabase seller registration sync note:', sbErr);
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save merchant password.';
    return { success: false, error: msg };
  }
}

/**
 * Verifies merchant password.
 * If valid, establishes session token and persists it.
 */
export async function verifyMerchantPassword(
  email: string,
  password: string
): Promise<{
  success: boolean;
  token?: string;
  shopName?: string;
  notFound?: boolean;
  error?: string;
}> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) {
    return { success: false, error: 'Email is required.' };
  }

  if (!password) {
    return { success: false, error: 'Password is required.' };
  }

  // 1. Check local password store first
  const accounts = getAllMerchantAccounts();
  const account = accounts[cleanEmail];

  if (account) {
    const computedHash = await hashPassword(password, account.salt);
    if (computedHash === account.passwordHash) {
      // Password matches! Retrieve or assign token
      let token = getSavedMerchantToken(cleanEmail);
      if (!token && isMockDashboard()) {
        token = 'mock-demo-session-token';
      }
      if (token) {
        setStoredToken(token);
      }

      // Also try signing in to Supabase if configured
      if (isSupabaseConfigured) {
        supabase.auth.signInWithPassword({ email: cleanEmail, password }).catch(() => {});
      }

      return {
        success: true,
        token: token || undefined,
        shopName: account.shopName,
      };
    } else {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }
  }

  // 2. If not found in local store, try Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!sbError && data?.session) {
        // Automatically save to local store for future instant sign-in
        await setMerchantPassword(cleanEmail, password, data.user?.user_metadata?.shop_name);
        let token = getSavedMerchantToken(cleanEmail);
        if (!token && isMockDashboard()) {
          token = 'mock-demo-session-token';
        }
        if (token) {
          setStoredToken(token);
        }
        return {
          success: true,
          token: token || undefined,
          shopName: data.user?.user_metadata?.shop_name,
        };
      }
    } catch {
      // Supabase sign-in failed, proceed to not found
    }
  }

  // 3. No password record exists yet for this email
  return {
    success: false,
    notFound: true,
    error: 'No password set for this shop yet. Please sign in with a one-time code to create your password.',
  };
}

/**
 * Changes an existing merchant password.
 */
export async function changeMerchantPassword(
  email: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const verifyRes = await verifyMerchantPassword(email, oldPassword);
  if (!verifyRes.success) {
    return { success: false, error: verifyRes.error || 'Current password is incorrect.' };
  }

  return setMerchantPassword(email, newPassword, verifyRes.shopName);
}
