'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Search, ShoppingCart, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import AuthModal from './AuthModal';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
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
                placeholder="Search for restaurants, spas, electronics..." 
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-green-600 rounded-full text-white">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {user ? (
              <div className="hidden sm:flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                  Selam, {user.email?.split('@')[0]}
                </span>
                <button 
                  onClick={handleSignOut}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="hidden sm:flex text-sm font-medium text-gray-700 hover:text-green-700"
              >
                Selam, Sign In
              </button>
            )}
            
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-700 relative">
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
              placeholder="Search deals..." 
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
