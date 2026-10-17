'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/MiniAppContext';
import { Wifi, Battery, Signal, Smartphone, Monitor, CheckCircle2, Store, ArrowUpRight } from 'lucide-react';

interface DeviceFrameProps {
  children: React.ReactNode;
  onSwitchToWebsite?: () => void;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children, onSwitchToWebsite }) => {
  const { triggerDemoState } = useApp();
  const [frameMode, setFrameMode] = useState<'phone' | 'full'>('phone');


  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-0 md:p-6 lg:p-8 selection:bg-emerald-500 selection:text-white">
      {/* Desktop Top Banner with Hackathon Context & Pitch */}
      <div className="w-full max-w-5xl hidden md:flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 font-mono font-bold rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>TirfMarket</span>
          </div>
          <span className="text-slate-400">
            Cashless M-PESA Hackathon · Team Blood Hounds
          </span>
        </div>

        {/* View toggle (Phone Frame vs Wide) + Direct links to web routes */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Link
              href="/dashboard"
              className="hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              <span>Live Merchant Counter</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
            <span>•</span>
            <Link
              href="/merchant/register"
              className="hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              <span>Register Shop (TIN)</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex p-0.5 bg-slate-900 rounded-lg border border-slate-800">
            <button
              onClick={() => setFrameMode('phone')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors ${
                frameMode === 'phone'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>390px Mobile</span>
            </button>
            <button
              onClick={() => setFrameMode('full')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors ${
                frameMode === 'full'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>
            {onSwitchToWebsite && (
              <button
                onClick={onSwitchToWebsite}
                className="px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors text-amber-300 hover:text-amber-200 hover:bg-slate-800"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Website Portal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className={`w-full ${frameMode === 'phone' ? 'max-w-5xl' : 'max-w-4xl'} my-0 md:my-6 grid grid-cols-1 ${frameMode === 'phone' ? 'lg:grid-cols-12 gap-8' : ''} items-start`}>
        {/* Left Side (Desktop pitch helper card) */}
        {frameMode === 'phone' && (
          <div className="hidden lg:block lg:col-span-5 space-y-4 pt-2">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  The 60-Second Demo Story
                </span>
                <h3 className="text-lg font-black text-white mt-1 leading-snug">
                  Hyperlocal Deals & Instant Cashless M-PESA Sales
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  &ldquo;We help shoppers find nearby shop deals and pay with M-PESA, so that small shops turn quiet hours into cashless sales.&rdquo;
                </p>
              </div>

              {/* 6-step walkthrough checklist */}
              <div className="space-y-2.5 pt-2 text-xs border-t border-slate-800">
                <div 
                  onClick={() => triggerDemoState('customer_home')}
                  className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-200">Bole Deals Feed:</strong> Sunrise Café is 120 m away with a 20% discount alert.
                  </div>
                </div>

                <div 
                  onClick={() => triggerDemoState('deal_detail')}
                  className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-200">Claim & 5m Hold:</strong> Tap Claim to hold 1 unit for 5 minutes.
                  </div>
                </div>

                <div 
                  onClick={() => triggerDemoState('paying')}
                  className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-200">M-PESA STK Push:</strong> Realistic phone prompt with PIN pad.
                  </div>
                </div>

                <div 
                  onClick={() => triggerDemoState('paid')}
                  className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-slate-200">Counter Voucher:</strong> Large 8-char code <code className="text-emerald-300">K7M4Q9XR</code>, QR & pickup countdown.
                  </div>
                </div>

                <div 
                  onClick={() => triggerDemoState('merchant_dashboard')}
                  className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    5
                  </span>
                  <div>
                    <strong className="text-slate-200">Shop Dashboard:</strong> Sale appears live, cashless ETB total rises.
                  </div>
                </div>

                <div 
                  onClick={() => triggerDemoState('merchant_dashboard')}
                  className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 cursor-pointer transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    6
                  </span>
                  <div>
                    <strong className="text-slate-200">Counter Redemption:</strong> Shop enters code to complete cashless exchange.
                  </div>
                </div>
              </div>
            </div>

            {/* Trust highlights */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Custody Financial Compliance</span>
              </div>
              <p>We never hold customer funds. Payments flow directly through M-PESA shortcode routing.</p>
            </div>
          </div>
        )}

        {/* Center / Right Column: The Phone Frame */}
        <div className={`w-full ${frameMode === 'phone' ? 'lg:col-span-7 flex justify-center' : 'flex justify-center'}`}>
          <div className={`w-full ${frameMode === 'phone' ? 'max-w-[390px]' : 'max-w-[480px]'} bg-slate-100 min-h-screen md:min-h-[820px] md:max-h-[880px] md:rounded-[44px] shadow-2xl md:ring-8 md:ring-slate-800 md:ring-offset-4 md:ring-offset-slate-950 flex flex-col overflow-hidden relative border-x md:border border-slate-800`}>
            
            {/* Phone Top Notch & Status Bar */}
            <div className="bg-emerald-950 text-white px-6 pt-3 pb-1 flex items-center justify-between text-xs font-semibold select-none shrink-0 z-40">
              <span className="text-[11px] tracking-tight font-mono">{currentTime}</span>
              <div className="w-20 h-4 bg-slate-950 rounded-full mx-auto -mt-1 hidden sm:block border border-slate-800/80"></div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Signal className="w-3 h-3 text-emerald-400" />
                <Wifi className="w-3 h-3" />
                <Battery className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              </div>
            </div>

            {/* Inner App Canvas */}
            <div className="flex-1 overflow-y-auto bg-slate-100 flex flex-col relative text-slate-900 scroll-smooth">
              {children}
            </div>

            {/* Phone Bottom Home Bar */}
            <div className="h-4 bg-white shrink-0 flex items-center justify-center select-none pb-1">
              <div className="w-28 h-1 bg-slate-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
