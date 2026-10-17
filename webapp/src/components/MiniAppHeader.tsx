'use client';

import React from 'react';
import { useApp } from '@/context/MiniAppContext';
import { MapPin, Globe } from 'lucide-react';

export const MiniAppHeader: React.FC = () => {
  const { language, setLanguage, t } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-emerald-900 text-white shadow-md border-b border-emerald-800">
      {/* Top micro bar for hackathon context */}
      <div className="bg-emerald-950/80 px-4 py-1 text-[11px] text-emerald-200/90 flex items-center justify-between border-b border-emerald-800/40">
        <span className="flex items-center gap-1.5 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>Cashless M-PESA Hackathon · Team Blood Hounds</span>
        </span>
        <span className="text-[10px] bg-emerald-800/60 text-emerald-200 px-1.5 py-0.5 rounded font-mono">
          ETB ONLY
        </span>
      </div>

      {/* Main app bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-base shadow-sm border border-emerald-500/40">
            T
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white leading-none">
                {t.appTitle}
              </span>
              <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full leading-tight">
                2 km
              </span>
            </div>
            <p className="text-[10px] text-emerald-300 font-medium">Bole, Addis Ababa</p>
          </div>
        </div>

        {/* Right side controls: Location & Language */}
        <div className="flex items-center gap-1.5">
          {/* Location badge */}
          <div className="hidden xs:flex items-center gap-1 px-2 py-1 bg-emerald-800/60 rounded-md text-[11px] text-emerald-100 border border-emerald-700/50">
            <MapPin className="w-3 h-3 text-emerald-300" />
            <span className="truncate max-w-[85px]">{t.locationPill}</span>
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
            aria-label="Toggle language between English and Amharic"
            className="flex items-center gap-1 px-2 py-1.5 bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-xs font-medium rounded-md border border-emerald-700 transition-colors text-white min-h-[36px]"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-300" />
            <span className={language === 'am' ? 'font-serif font-bold text-amber-300' : 'font-sans'}>
              {language === 'en' ? 'አማ' : 'EN'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
