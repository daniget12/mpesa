'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/MiniAppContext';
import { Shop } from '@/types/miniapp';
import { ArrowLeft, MapPin, Upload, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface MerchantRegisterProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const MerchantRegister: React.FC<MerchantRegisterProps> = ({ onBack, onSuccess }) => {
  const { registerNewShop } = useApp();

  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [tillNumber, setTillNumber] = useState('');
  const [category, setCategory] = useState<'Café' | 'Bakery' | 'Juice' | 'Books' | 'Barber' | 'Other'>('Café');
  const [address, setAddress] = useState('Bole Road, Near Edna Mall');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [pinLocation, setPinLocation] = useState({ x: 55, y: 50 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !tinNumber || !email) return;

    registerNewShop({
      name: shopName,
      tinNumber,
      tillNumber: tillNumber || undefined,
      category,
      address,
      mapCoords: pinLocation,
    });

    onSuccess();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden pb-20 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 p-1.5 -ml-1 rounded-lg hover:bg-slate-200/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <span className="text-xs font-bold text-emerald-800 font-mono">
          Merchant Onboarding
        </span>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Register Your Shop
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Reach local foot traffic in Bole and accept cashless M-PESA payments with zero transaction custody.
          </p>
        </div>

        {/* Verification Note */}
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-950 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Mandatory Review:</strong> We review every shop before it can post deals. This usually takes under a day. We verify your TIN on e-Trade to ensure trust for buyers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Shop Name *
            </label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Abyssinia Artisanal Bakery"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Business Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@myshop.et"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Shop['category'])}
                className="w-full h-10 px-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              >
                <option value="Café">Café</option>
                <option value="Bakery">Bakery</option>
                <option value="Juice">Juice Bar</option>
                <option value="Books">Books & Stationery</option>
                <option value="Barber">Barbershop & Grooming</option>
                <option value="Other">Other Retail</option>
              </select>
            </div>
          </div>

          {/* TIN Number (Required) & M-PESA Till (Optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                TIN Number (Required) *
              </label>
              <input
                type="text"
                required
                value={tinNumber}
                onChange={(e) => setTinNumber(e.target.value)}
                placeholder="10-digit TIN e.g. 0048192031"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                M-PESA Till # (Optional)
              </label>
              <input
                type="text"
                value={tillNumber}
                onChange={(e) => setTillNumber(e.target.value)}
                placeholder="e.g. 441029"
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              />
            </div>
          </div>

          {/* Location Address */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Shop Address in Bole *
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Bole Medhanialem, Behind Edna Mall"
              className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
            />
          </div>

          {/* Map to drop a pin */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                Tap to Drop Pin on Bole Map *
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                X: {pinLocation.x}% · Y: {pinLocation.y}%
              </span>
            </div>
            <div 
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                setPinLocation({ x, y });
              }}
              className="relative w-full h-32 bg-slate-100 rounded-xl border border-slate-300 overflow-hidden cursor-crosshair"
            >
              <div className="absolute inset-0 bg-[#eef2ef] flex items-center justify-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Bole Neighborhood Grid · Tap to set storefront location
                </span>
              </div>
              <div 
                className="absolute z-10 -translate-x-1/2 -translate-y-full pointer-events-none transition-all"
                style={{ left: `${pinLocation.x}%`, top: `${pinLocation.y}%` }}
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 border-2 border-white text-white flex items-center justify-center shadow-md">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Storefront photo */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Storefront Photo (Optional)
            </label>
            <div 
              onClick={() => setPhotoUploaded(!photoUploaded)}
              className={`p-3 rounded-xl border border-dashed flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                photoUploaded 
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                  : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {photoUploaded ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold">Storefront photo attached (storefront.jpg)</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-medium">Click to upload storefront photo</span>
                </>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full h-12 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-lg transition-all"
          >
            Submit Application for Review
          </button>
        </form>
      </div>
    </div>
  );
};
