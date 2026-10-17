'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Search, User as UserIcon, LogOut, Globe, ShieldCheck, Store } from 'lucide-react';
import Link from 'next/link';
import AuthModal from './AuthModal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Header({ searchQuery = '', onSearchChange }: HeaderProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    const fetchUserAndProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const { data } = await supabase.from('profiles').select('role, account_type, full_name').eq('id', session.user.id).single();
          if (!isMounted) return;
          if (data) {
            if (data.role === 'admin') setIsAdmin(true);
            if (data.account_type === 'seller') setIsSeller(true);
            if (data.full_name) setProfileName(data.full_name);
          }
        } else {
          setIsAdmin(false);
          setIsSeller(false);
          setProfileName('');
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setIsAdmin(false);
          setIsSeller(false);
          setProfileName('');
        }
      }
    };

    fetchUserAndProfile();

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
        fetchUserAndProfile();
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
  }, []);

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Graceful
      }
    }
    setUser(null);
    setIsAdmin(false);
    setIsSeller(false);
    setProfileName('');
  };

  return (
    <>
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="lg:hidden min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-gray-700" aria-label="Menu">
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/" className="min-h-[44px] flex items-center text-2xl font-bold text-green-700">
              <span className="text-yellow-500">Tirf</span>&nbsp;Market
            </Link>
          </div>

          <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={t("header.search")} 
                className="w-full pl-4 pr-10 py-2 min-h-[44px] border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-green-600 rounded-full text-white pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <Link 
              href="/dashboard" 
              className="text-xs font-semibold text-gray-600 hover:text-green-700 transition-colors uppercase tracking-wider min-h-[44px] px-2.5 py-1 rounded hover:bg-gray-100 flex items-center"
            >
              {t("header.dashboard")}
            </Link>

            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-green-700 min-h-[44px] p-2">
                <Globe className="w-4 h-4" /> {language.toUpperCase()}
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button onClick={() => setLanguage('en')} className="block w-full text-left px-4 py-2.5 min-h-[44px] text-sm hover:bg-green-50 text-gray-700">English</button>
                <button onClick={() => setLanguage('am')} className="block w-full text-left px-4 py-2.5 min-h-[44px] text-sm hover:bg-green-50 text-gray-700">አማርኛ</button>
                <button onClick={() => setLanguage('om')} className="block w-full text-left px-4 py-2.5 min-h-[44px] text-sm hover:bg-green-50 text-gray-700">Afaan Oromoo</button>
                <button onClick={() => setLanguage('ti')} className="block w-full text-left px-4 py-2.5 min-h-[44px] text-sm hover:bg-green-50 text-gray-700">ትግርኛ</button>
              </div>
            </div>

            {user ? (
              <div className="hidden sm:flex items-center gap-4">
                {isAdmin && (
                  <Link href="/admin" className="text-sm font-bold text-purple-600 hover:text-purple-700 bg-purple-50 px-3 py-1 rounded-full flex items-center gap-1 min-h-[44px]">
                    <ShieldCheck className="w-4 h-4" /> Admin
                  </Link>
                )}
                {isSeller && !isAdmin && (
                  <Link href="/seller" className="text-sm font-bold text-green-600 hover:text-green-700 bg-green-50 px-3 py-1 rounded-full flex items-center gap-1 min-h-[44px]">
                    <Store className="w-4 h-4" /> Seller Dashboard
                  </Link>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {profileName || user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
                <button 
                  onClick={handleSignOut}
                  className="min-h-[44px] min-w-[44px] text-sm text-red-600 hover:text-red-700 flex items-center justify-center gap-1"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : isSupabaseConfigured ? (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="hidden sm:flex items-center min-h-[44px] text-sm font-medium text-gray-700 hover:text-green-700 whitespace-nowrap px-2"
              >
                {t("header.signin")}
              </button>
            ) : null}
            
            {/* Mobile Account / Auth Button */}
            {user ? (
              <button 
                className="min-h-[44px] min-w-[44px] p-2 text-red-600 sm:hidden flex items-center justify-center"
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                <LogOut className="w-6 h-6" />
              </button>
            ) : isSupabaseConfigured ? (
              <button 
                className="min-h-[44px] min-w-[44px] p-2 text-gray-700 sm:hidden flex items-center justify-center"
                onClick={() => setIsAuthModalOpen(true)}
                aria-label="Sign in"
              >
                <UserIcon className="w-6 h-6" />
              </button>
            ) : null}
          </div>
        </div>
        
        {/* Mobile Search */}
        <div className="p-3 border-t lg:hidden">
          <div className="relative w-full">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={t("header.search")} 
              className="w-full pl-4 pr-10 py-2.5 min-h-[44px] border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
}
