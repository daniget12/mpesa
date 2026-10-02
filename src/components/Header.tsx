'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Search, ShoppingCart, User, LogOut, Globe } from 'lucide-react';
import Link from 'next/link';
import AuthModal from './AuthModal';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { Language } from '@/locales/translations';

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2">
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            <Link href="/" className="text-2xl font-bold text-green-700 flex items-center gap-1">
              <span className="text-yellow-500">Addis</span>Deals
            </Link>
          </div>

          <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder={t("header.search")} 
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-green-600 rounded-full text-white">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-green-700 p-2">
                <Globe className="w-4 h-4" /> {language.toUpperCase()}
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button onClick={() => setLanguage('en')} className="block w-full text-left px-4 py-2 text-sm hover:bg-green-50 text-gray-700">English</button>
                <button onClick={() => setLanguage('am')} className="block w-full text-left px-4 py-2 text-sm hover:bg-green-50 text-gray-700">አማርኛ</button>
                <button onClick={() => setLanguage('om')} className="block w-full text-left px-4 py-2 text-sm hover:bg-green-50 text-gray-700">Afaan Oromoo</button>
              </div>
            </div>

            {user ? (
              <div className="hidden sm:flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
                <button 
                  onClick={handleSignOut}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="hidden sm:flex text-sm font-medium text-gray-700 hover:text-green-700 whitespace-nowrap"
              >
                {t("header.signin")}
              </button>
            )}
            
            <div className="flex items-center gap-2 lg:gap-4">
              <button className="p-2 text-gray-700 relative hidden sm:block">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">0</span>
              </button>
              <button 
                className="p-2 text-gray-700 sm:hidden"
                onClick={() => !user && setIsAuthModalOpen(true)}
              >
                {user ? <LogOut className="w-6 h-6 text-red-600" onClick={handleSignOut} /> : <User className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Search */}
        <div className="p-3 border-t lg:hidden">
          <div className="relative w-full">
            <input 
              type="text" 
              placeholder={t("header.search")} 
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
