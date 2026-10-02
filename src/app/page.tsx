'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import DealCard from '@/components/DealCard';
import MpesaModal from '@/components/MpesaModal';
import { Utensils, Coffee, Bed, Sparkles, MonitorSmartphone, Car } from 'lucide-react';

const DEALS = [
  {
    id: '1',
    title: 'Traditional Habesha Buffet for Two - Includes Tej',
    merchant: 'Yod Abyssinia Traditional Restaurant',
    location: 'Bole, Addis Ababa',
    originalPrice: 2500,
    discountedPrice: 1800,
    image: 'https://images.unsplash.com/photo-1627993081198-5c4a5c9a0d8e?auto=format&fit=crop&q=80&w=800',
    bought: 450
  },
  {
    id: '2',
    title: 'Full Body Massage & Sauna - 90 Minutes',
    merchant: 'Kuriftu Resort & Spa',
    location: 'Bishoftu',
    originalPrice: 3000,
    discountedPrice: 1950,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=800',
    bought: 320
  },
  {
    id: '3',
    title: 'Ethiopian Coffee Ceremony Experience for Group of 4',
    merchant: 'Tomoca Coffee House',
    location: 'Piassa, Addis Ababa',
    originalPrice: 800,
    discountedPrice: 500,
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800',
    bought: 890
  },
  {
    id: '4',
    title: 'Weekend Getaway - 2 Nights Stay with Breakfast',
    merchant: 'Haile Resort',
    location: 'Hawassa',
    originalPrice: 15000,
    discountedPrice: 10500,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800',
    bought: 150
  },
  {
    id: '5',
    title: 'Samsung Galaxy A14 128GB - Official Warranty',
    merchant: 'Glorious Electronics',
    location: 'Edna Mall, Addis Ababa',
    originalPrice: 14000,
    discountedPrice: 12500,
    image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&q=80&w=800',
    bought: 60
  },
  {
    id: '6',
    title: 'Car Wash & Interior Detailing Premium Package',
    merchant: 'Clean & Shine Auto Care',
    location: 'Kazanchis, Addis Ababa',
    originalPrice: 1200,
    discountedPrice: 800,
    image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&q=80&w=800',
    bought: 230
  }
];

const CATEGORIES = [
  { name: 'Food & Drink', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { name: 'Coffee & Cafe', icon: Coffee, color: 'bg-amber-100 text-amber-700' },
  { name: 'Spa & Wellness', icon: Sparkles, color: 'bg-purple-100 text-purple-600' },
  { name: 'Hotels & Travel', icon: Bed, color: 'bg-blue-100 text-blue-600' },
  { name: 'Electronics', icon: MonitorSmartphone, color: 'bg-gray-100 text-gray-700' },
  { name: 'Auto Services', icon: Car, color: 'bg-red-100 text-red-600' },
];

export default function Home() {
  const [selectedDeal, setSelectedDeal] = useState<typeof DEALS[0] | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-800 via-green-700 to-yellow-600 rounded-3xl p-8 mb-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500 rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500 rounded-full opacity-20 blur-3xl translate-y-1/2 -translate-x-1/3"></div>
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              Discover the Best Deals in Ethiopia
            </h1>
            <p className="text-lg md:text-xl mb-8 text-green-50">
              Save up to 70% on restaurants, spas, electronics, and getaways. Securely pay with M-Pesa Safaricom.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 px-8 rounded-full transition-colors shadow-lg">
                Explore Deals
              </button>
              <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 text-white font-bold py-3 px-8 rounded-full transition-colors">
                How it works
              </button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-green-600 inline-block pb-1">Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-shadow border border-gray-100">
                <div className={`p-3 rounded-full ${cat.color}`}>
                  <cat.icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-gray-700 text-center">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Deals */}
        <div>
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-green-600 inline-block pb-1">Trending Today</h2>
            <button className="text-green-700 font-medium hover:underline text-sm">View All</button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {DEALS.map((deal) => (
              <DealCard 
                key={deal.id}
                {...deal}
                onBuy={() => setSelectedDeal(deal)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-12 pb-8 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 border-b border-gray-800 pb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-1">
                <span className="text-yellow-500">Addis</span>Deals
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                The leading daily deal platform in Ethiopia. Discover, buy and share the best deals in your city.
              </p>
              <div className="flex gap-2">
                <div className="w-8 h-6 bg-green-600 rounded-sm"></div>
                <div className="w-8 h-6 bg-yellow-500 rounded-sm"></div>
                <div className="w-8 h-6 bg-red-600 rounded-sm"></div>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Work with Us</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Run a Deal</a></li>
                <li><a href="#" className="hover:text-white">Merchant Center</a></li>
                <li><a href="#" className="hover:text-white">Affiliate Program</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Payment Partners</h4>
              <div className="bg-white rounded p-2 inline-block">
                <span className="text-green-600 font-bold tracking-wider">M-PESA</span>
              </div>
            </div>
          </div>
          <div className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} AddisDeals. All rights reserved. Made in Ethiopia.
          </div>
        </div>
      </footer>

      {/* M-Pesa Payment Modal */}
      {selectedDeal && (
        <MpesaModal 
          isOpen={!!selectedDeal} 
          onClose={() => setSelectedDeal(null)} 
          amount={selectedDeal.discountedPrice}
          dealTitle={selectedDeal.title}
        />
      )}
    </div>
  );
}
