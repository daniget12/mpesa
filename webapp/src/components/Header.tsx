'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  User as UserIcon,
  LogOut,
  Globe,
  ShieldCheck,
  Store,
  ChevronDown,
  X,
  Smartphone,
  Sparkles,
  ShoppingBag,
  Ticket,
} from 'lucide-react';
import Link from 'next/link';
import AuthModal from './AuthModal';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSwitchToMiniApp?: () => void;
}

export default function Header({ searchQuery = '', onSearchChange, onSwitchToMiniApp }: HeaderProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, profileName, isAdmin, isMerchant, isBuyer, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isForShopsOpen, setIsForShopsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const forShopsRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (forShopsRef.current && !forShopsRef.current.contains(event.target as Node)) {
        setIsForShopsOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsForShopsOpen(false);
        setIsLangMenuOpen(false);
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

  const handleSignOut = async () => {
    await signOut();
  };

  const getLanguageLabel = (code: string) => {
    switch (code) {
      case 'am': return 'አማርኛ';
      case 'om': return 'Afaan Oromoo';
      case 'ti': return 'ትግርኛ';
      default: return 'English';
    }
  };

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Wordmark */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="lg:hidden min-h-[40px] min-w-[40px] p-2 flex items-center justify-center text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-900/10 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Tirf<span className="text-emerald-600">Market</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:block">
                  Ethiopia Cashless Deals
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Search Field */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={t('header.search') || 'Search cafe, bakery, burgers, discounts...'}
                className="w-full pl-10 pr-4 py-2 min-h-[40px] bg-slate-100/80 hover:bg-slate-100 border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm text-slate-800 placeholder-slate-400 transition-all"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Controls & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* For Shops Dropdown */}
            {isMerchant && (
              <div className="relative" ref={forShopsRef}>
                <button
                  type="button"
                  onClick={() => setIsForShopsOpen((prev) => !prev)}
                  aria-haspopup="true"
                  aria-expanded={isForShopsOpen}
                  className="text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-colors min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Store className="w-4 h-4 text-emerald-700" />
                  <span className="hidden sm:inline">{t('header.forShops') || 'For Shops'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isForShopsOpen ? "rotate-180" : ""}`} />
                </button>

                {isForShopsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 shadow-xl rounded-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <Link
                      href="/merchant/register"
                      onClick={() => setIsForShopsOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/60 transition-colors"
                    >
                      <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{t('header.registerShop') || 'Register Shop'}</span>
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsForShopsOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/60 transition-colors border-t border-slate-100"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{t('header.merchantLogin') || 'Merchant Dashboard'}</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Language Dropdown */}
            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => setIsLangMenuOpen((prev) => !prev)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-emerald-700 min-h-[38px] px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Select language"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span className="uppercase tracking-wider font-mono text-[11px]">{language}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-200 shadow-xl rounded-xl py-1 rounded-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  {(['en', 'am', 'om', 'ti'] as const).map((code) => (
                    <button
                      key={code}
                      onClick={() => {
                        setLanguage(code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`block w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${language === code ? "bg-emerald-50 text-emerald-800 font-bold" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      {getLanguageLabel(code)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* My Claims / Tickets Button - Hidden unless confirmed real by user */}
            {/* User Account / Sign In - Hidden unless confirmed real by user */}
            {user && isMerchant && (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/dashboard"
                  className="text-xs font-bold bg-emerald-100 text-emerald-900 px-2 py-1 rounded-md hover:bg-emerald-200 transition-colors"
                >
                  Merchant
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Sign Out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Input Bar */}
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-slate-100">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={t('header.search') || 'Search cafe, bakery, burgers...'}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 animate-in fade-in duration-150">
            {onSwitchToMiniApp && (
              <button
                type="button"
                onClick={() => {
                  onSwitchToMiniApp();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold text-xs"
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Interactive Telegram Mini App</span>
                </span>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-mono">PROMPT</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              {isMerchant && (
                <>
                  <Link
                    href="/merchant/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800"
                  >
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>Register Shop</span>
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Merchant Hub</span>
                  </Link>
                </>
              )}
              {/* My Profile & Claim Tickets - Hidden unless confirmed real by user */}
            </div>
          </div>
        )}
      </header>

      {/* Fallback Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
