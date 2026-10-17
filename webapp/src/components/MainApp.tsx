'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/MiniAppContext';

// Shell & Common
import { DeviceFrame } from './common/DeviceFrame';
import { MiniAppHeader } from './MiniAppHeader';
import { BottomNav } from './BottomNav';
import { DemoDrawer } from './DemoDrawer';
import { MpesaStkModal } from './MpesaStkModal';

// Customer screens
import { CustomerHome } from './customer/CustomerHome';
import { DealDetail } from './customer/DealDetail';
import { ClaimReserveModal } from './customer/ClaimReserveModal';
import { VoucherScreen } from './customer/VoucherScreen';
import { MyClaims } from './customer/MyClaims';
import { VoucherStateAlerts } from './customer/VoucherStateAlerts';

// Merchant screens
import { MerchantDashboard } from './merchant/MerchantDashboard';
import { PostDeal } from './merchant/PostDeal';
import { MyDeals } from './merchant/MyDeals';
import { MerchantRegister } from './merchant/MerchantRegister';
import { MerchantPending } from './merchant/MerchantPending';
import { MerchantLogin } from './merchant/MerchantLogin';

// Admin screens
import { AdminDashboard } from './admin/AdminDashboard';

interface MainAppProps {
  onSwitchToWebsite?: () => void;
}

export const MainApp: React.FC<MainAppProps> = ({ onSwitchToWebsite }) => {
  const { 
    role, 
    setRole, 
    customerTab, 
    setCustomerTab, 
    selectedDeal, 
    setSelectedDeal, 
    activeClaim, 
    startClaimReservation, 
    setStkModalOpen, 
    demoState, 
    triggerDemoState 
  } = useApp();

  const [merchantSubView, setMerchantSubView] = useState<'dashboard' | 'post_deal' | 'my_deals' | 'register' | 'pending' | 'login'>('dashboard');

  const handleStartClaim = () => {
    if (!selectedDeal) return;
    startClaimReservation(selectedDeal);
  };

  return (
    <DeviceFrame onSwitchToWebsite={onSwitchToWebsite}>
      <MiniAppHeader />

      <main className="flex-1 p-4 overflow-y-auto">
        {/* CUSTOMER PERSPECTIVE */}
        {role === 'customer' && (
          <>
            {/* 1. Explicit Demo Alert States */}
            {demoState && ['expired_hold', 'sold_out', 'payment_failed', 'expired_pickup', 'too_many_claims'].includes(demoState) ? (
              <VoucherStateAlerts
                onBackToDeals={() => {
                  triggerDemoState('customer_home');
                }}
              />
            ) : activeClaim && activeClaim.status === 'paid' ? (
              /* 2. Magic Moment: Paid Voucher Screen */
              <VoucherScreen
                onBackToHome={() => {
                  setSelectedDeal(null);
                  setCustomerTab('claims');
                }}
              />
            ) : activeClaim && activeClaim.status === 'reserved' ? (
              /* 3. 5-Minute Hold Screen */
              <ClaimReserveModal
                onBack={() => {
                  setSelectedDeal(null);
                }}
                onInitiatePayment={() => {
                  setStkModalOpen(true);
                }}
              />
            ) : selectedDeal ? (
              /* 4. Deal Detail */
              <DealDetail
                deal={selectedDeal}
                onBack={() => setSelectedDeal(null)}
                onClaim={handleStartClaim}
              />
            ) : customerTab === 'claims' ? (
              /* 5. My Claims List */
              <MyClaims
                onSelectClaim={(claim) => {
                  if (claim.status === 'paid') {
                    triggerDemoState('paid');
                  }
                }}
                onExploreDeals={() => {
                  setCustomerTab('deals');
                }}
              />
            ) : (
              /* 6. Deals Home */
              <CustomerHome />
            )}
          </>
        )}

        {/* MERCHANT PERSPECTIVE */}
        {role === 'merchant' && (
          <>
            {/* Top Merchant Sub-Navigation Links */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 text-xs border-b border-slate-200 no-scrollbar">
              <button
                onClick={() => setMerchantSubView('dashboard')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap min-h-[32px] ${
                  merchantSubView === 'dashboard'
                    ? 'bg-emerald-800 text-white'
                    : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setMerchantSubView('post_deal')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap min-h-[32px] ${
                  merchantSubView === 'post_deal'
                    ? 'bg-emerald-800 text-white'
                    : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                Post Deal
              </button>
              <button
                onClick={() => setMerchantSubView('my_deals')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap min-h-[32px] ${
                  merchantSubView === 'my_deals'
                    ? 'bg-emerald-800 text-white'
                    : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                My Deals
              </button>
              <button
                onClick={() => setMerchantSubView('register')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap min-h-[32px] ${
                  merchantSubView === 'register'
                    ? 'bg-emerald-800 text-white'
                    : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                Register
              </button>
              <button
                onClick={() => setMerchantSubView('pending')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap min-h-[32px] ${
                  merchantSubView === 'pending'
                    ? 'bg-emerald-800 text-white'
                    : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                Review Status
              </button>
              <button
                onClick={() => setMerchantSubView('login')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap min-h-[32px] ${
                  merchantSubView === 'login'
                    ? 'bg-emerald-800 text-white'
                    : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                Sign In
              </button>
            </div>

            {merchantSubView === 'dashboard' && (
              <MerchantDashboard
                onNavigateToPostDeal={() => setMerchantSubView('post_deal')}
                onNavigateToMyDeals={() => setMerchantSubView('my_deals')}
              />
            )}

            {merchantSubView === 'post_deal' && (
              <PostDeal
                onBack={() => setMerchantSubView('dashboard')}
                onSuccess={() => setMerchantSubView('dashboard')}
              />
            )}

            {merchantSubView === 'my_deals' && (
              <MyDeals
                onBack={() => setMerchantSubView('dashboard')}
                onNavigateToPostDeal={() => setMerchantSubView('post_deal')}
              />
            )}

            {merchantSubView === 'register' && (
              <MerchantRegister
                onBack={() => setMerchantSubView('dashboard')}
                onSuccess={() => setMerchantSubView('pending')}
              />
            )}

            {merchantSubView === 'pending' && (
              <MerchantPending
                onBackToDashboard={() => setMerchantSubView('dashboard')}
                onGoToAdmin={() => setRole('admin')}
              />
            )}

            {merchantSubView === 'login' && (
              <MerchantLogin
                onBack={() => setMerchantSubView('dashboard')}
                onSuccess={() => setMerchantSubView('dashboard')}
              />
            )}
          </>
        )}

        {/* ADMIN PERSPECTIVE */}
        {role === 'admin' && <AdminDashboard />}
      </main>

      {/* Floating M-PESA STK Push Modal */}
      <MpesaStkModal />

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Demo Controls Drawer */}
      <DemoDrawer />
    </DeviceFrame>
  );
};
