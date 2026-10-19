'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export type AccountType = 'buyer' | 'seller' | null;

export interface AuthContextType {
  user: User | null;
  accountType: AccountType;
  role: 'user' | 'admin' | null;
  profileName: string;
  isMerchant: boolean;
  isBuyer: boolean;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  setSimulatedAccountType?: (type: AccountType) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accountType: null,
  role: null,
  profileName: '',
  isMerchant: false,
  isBuyer: true,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUser(null);
      setAccountType(null);
      setRole(null);
      setProfileName('');
      setLoading(false);
      return;
    }

    setUser(currentUser);

    // Initial check from metadata
    const metaType = currentUser.user_metadata?.account_type as AccountType | undefined;
    if (metaType) {
      setAccountType(metaType);
    }
    const metaName = (currentUser.user_metadata?.full_name as string) || '';
    if (metaName) {
      setProfileName(metaName);
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, account_type, full_name')
        .eq('id', currentUser.id)
        .single();

      if (!error && data) {
        if (data.account_type) {
          setAccountType(data.account_type as AccountType);
        }
        if (data.role) {
          setRole(data.role as 'user' | 'admin');
        }
        if (data.full_name) {
          setProfileName(data.full_name);
        }
      }
    } catch (e) {
      console.warn('Could not fetch user profile details:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        await fetchProfile(session?.user ?? null);
      } catch (err) {
        console.warn('Auth session initialization failed:', err);
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (isMounted) {
          await fetchProfile(session?.user ?? null);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } catch {
      return () => {
        isMounted = false;
      };
    }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    setUser(null);
    setAccountType(null);
    setRole(null);
    setProfileName('');
  }, []);

  const isMerchant = accountType === 'seller';
  // A user is a buyer if their accountType is explicitly 'buyer', or if they are a guest browsing deals
  const isBuyer = accountType === 'buyer' || (!user && accountType === null);
  const isAdmin = role === 'admin';

  const value = useMemo(
    () => ({
      user,
      accountType,
      role,
      profileName,
      isMerchant,
      isBuyer,
      isAdmin,
      loading,
      signOut,
    }),
    [user, accountType, role, profileName, isMerchant, isBuyer, isAdmin, loading, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
