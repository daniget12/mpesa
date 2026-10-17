'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Menu, Search, User as UserIcon, LogOut, Globe, ShieldCheck, Store, ChevronDown, X, Smartphone } from 'lucide-react';
import Link from 'next/link';
import AuthModal from './AuthModal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSwitchToMiniApp?: () => void;
}

export default function Header({ searchQuery = '', onSearchChange, onSwitchToMiniApp }: HeaderProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const [isForShopsOpen, setIsForShopsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const forShopsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (forShopsRef.current && !forShopsRef.current.contains(event.target as Node)) {
        setIsForShopsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsForShopsOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
            <button 
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="lg:hidden min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-gray-700 cursor-pointer" 
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
            {onSwitchToMiniApp && (
              <button
                type="button"
                onClick={onSwitchToMiniApp}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer"
                title="Open M-PESA Mini App view"
              >
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>M-PESA Mini App</span>
              </button>
            )}

            {/* For shops Dropdown Menu */}
            <div className="relative" ref={forShopsRef}>
              <button
                type="button"
                onClick={() => setIsForShopsOpen((prev) => !prev)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsForShopsOpen(true);
                  }
                }}
                aria-haspopup="true"
                aria-expanded={isForShopsOpen}
                aria-label={t("header.forShops")}
                className="text-xs font-semibold text-gray-700 hover:text-green-700 transition-colors uppercase tracking-wider min-h-[44px] px-3 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Store className="w-4 h-4 text-green-700" />
                <span>{t("header.forShops")}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isForShopsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isForShopsOpen && (
                <div 
                  role="menu"
                  className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 shadow-xl rounded-xl py-1.5 z-50 animate-scale-up"
                >
                  <Link
                    href="/merchant/register"
                    role="menuitem"
                    onClick={() => setIsForShopsOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 min-h-[44px] text-xs font-semibold text-gray-700 hover:text-green-700 hover:bg-green-50 transition-colors"
                  >
                    <Store className="w-4 h-4 text-green-600 shrink-0" />
                    <span>{t("header.registerShop")}</span>
                  </Link>
                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setIsForShopsOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 min-h-[44px] text-xs font-semibold text-gray-700 hover:text-green-700 hover:bg-green-50 transition-colors border-t border-gray-100"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{t("header.merchantLogin")}</span>
                  </Link>
                </div>
              )}
            </div>

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

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3 shadow-lg">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-2">
              {t("header.forShops")}
            </div>
            <div className="flex flex-col space-y-1">
              <Link
                href="/merchant/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-gray-800 hover:bg-green-50 hover:text-green-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <span>{t("header.registerShop")}</span>
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-gray-800 hover:bg-green-50 hover:text-green-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>{t("header.merchantLogin")}</span>
              </Link>

              {onSwitchToMiniApp && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSwitchToMiniApp();
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors w-full text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span>Launch M-PESA Mini App</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
}
