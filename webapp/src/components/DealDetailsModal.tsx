'use client';
import React from 'react';
import { X, MapPin } from 'lucide-react';
import Image from 'next/image';

export interface ModalDeal {
  id?: string;
  dealId?: string;
  title: string;
  description?: string;
  category?: string;
  price?: number;
  original_price?: number;
  finalAmount?: number;
  discounted_price?: number;
  discountPct?: number;
  merchantName?: string;
  merchant_name?: string;
  location?: string;
  image?: string;
  image_url?: string;
  distanceMeters?: number;
  highlights?: string;
  fine_print?: string;
}

interface DealDetailsModalProps {
  deal: ModalDeal | null;
  isOpen: boolean;
  onClose: () => void;
  onBuy: () => void;
}

export default function DealDetailsModal({ deal, isOpen, onClose, onBuy }: DealDetailsModalProps) {
  if (!isOpen || !deal) return null;

  const original = deal.price || deal.original_price;
  const current = deal.finalAmount ?? deal.discounted_price;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl relative my-auto flex flex-col overflow-hidden">
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 z-30 min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/90 rounded-full hover:bg-white text-gray-700 shadow-sm cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="relative h-64 sm:h-72 md:h-80 w-full bg-gray-200 shrink-0">
            <Image 
              src={deal.image || deal.image_url || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800'} 
              alt={deal.title} 
              fill 
              className="object-cover" 
            />
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 backdrop-blur-md">
              <MapPin className="w-4 h-4 text-green-400" /> {deal.distanceMeters ? (deal.distanceMeters < 1000 ? `${Math.round(deal.distanceMeters)} m` : `${(deal.distanceMeters / 1000).toFixed(1)} km`) : (deal.location || 'Addis Ababa')}
            </div>
          </div>
          
          <div className="p-5 sm:p-7">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{deal.title}</h2>
            <p className="text-gray-600 font-medium mb-6 text-sm">{deal.merchantName || deal.merchant_name || 'Tirf Market Partner'}</p>
            
            {/* Desktop Action Card */}
            <div className="hidden md:flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6">
              <div>
                {original !== undefined && current !== undefined && original > current && (
                  <p className="text-sm text-gray-400 line-through">{original} ETB</p>
                )}
                <p className="text-3xl font-black text-green-600">{current} ETB</p>
              </div>
              <button 
                onClick={() => { onClose(); onBuy(); }} 
                className="min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg shadow-green-600/30 cursor-pointer text-base"
              >
                Claim
              </button>
            </div>
            
            <div className="space-y-4">
              {deal.description && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-1 text-sm">About This Deal</h4>
                  <p className="text-gray-600 text-sm whitespace-pre-line leading-relaxed">{deal.description}</p>
                </div>
              )}
              {deal.highlights && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-1 text-sm">Highlights</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{deal.highlights}</p>
                </div>
              )}
              {deal.fine_print && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-1 text-sm">The Fine Print</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">{deal.fine_print}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Mobile Claim Bar */}
        <div className="md:hidden sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 shadow-lg z-20 flex items-center justify-between gap-3">
          <div>
            {original !== undefined && current !== undefined && original > current && (
              <p className="text-xs text-gray-400 line-through">{original} ETB</p>
            )}
            <p className="text-2xl font-black text-green-600">{current} ETB</p>
          </div>
          <button 
            onClick={() => { onClose(); onBuy(); }} 
            className="min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-md shadow-green-600/30 flex items-center justify-center cursor-pointer text-sm"
          >
            Claim
          </button>
        </div>
      </div>
    </div>
  );
}
