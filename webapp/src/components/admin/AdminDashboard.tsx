'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/MiniAppContext';
import { 
  CheckCircle2, 
  MapPin,
  ShieldCheck,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    shops, 
    verifyShopOnEtrade, 
    approveShop, 
    rejectShop, 
    claims, 
    completeRefund,
    reportedDeals 
  } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<'pending' | 'refunds' | 'reports'>('pending');

  const pendingShops = shops.filter(s => s.approvalStatus === 'pending');
  const refundsDue = claims.filter(c => c.status === 'expired_pickup');

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-200">
      {/* Title Header with Modern Auth badge */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Admin Trust & Compliance
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              AUDIT ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Verify merchant trade licenses on Ethiopian e-Trade registry, audit customer community flags, and clear automated M-PESA reversal queues.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200/80 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>e-Trade Portal: Online</span>
        </div>
      </div>

      {/* Admin Subtabs - Pill Design mirroring Login Page */}
      <div className="flex p-1.5 bg-slate-200/70 rounded-2xl gap-1 shadow-inner">
        <button
          onClick={() => setActiveAdminTab('pending')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all min-h-[38px] cursor-pointer ${
            activeAdminTab === 'pending'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Shop Approvals ({pendingShops.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('refunds')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all min-h-[38px] cursor-pointer ${
            activeAdminTab === 'refunds'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Refunds Due ({refundsDue.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('reports')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all min-h-[38px] cursor-pointer ${
            activeAdminTab === 'reports'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Reports ({reportedDeals.length})
        </button>
      </div>

      {/* TAB 1: PENDING SHOP APPROVALS */}
      {activeAdminTab === 'pending' && (
        <div className="space-y-4">
          {pendingShops.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Queue is clear</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All merchant trade registrations have been reviewed and verified on the Ethiopian e-Trade registry.
              </p>
            </div>
          ) : (
            pendingShops.map((shop) => (
              <div
                key={shop.id}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">{shop.name}</h4>
                    <span className="text-xs text-slate-500 font-medium">{shop.category} · Bole Subcity</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    Pending e-Trade
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl text-xs font-mono border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans font-semibold">TIN Number (Required)</span>
                    <span className="font-bold text-slate-900">{shop.tinNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans font-semibold">M-PESA Till</span>
                    <span className="font-bold text-slate-900">{shop.tillNumber || 'None provided'}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{shop.address}</span>
                </div>

                {/* The Required e-Trade Checkbox */}
                <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shop.eTradeVerified || false}
                      onChange={(e) => verifyShopOnEtrade(shop.id, e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-emerald-950">
                      I checked this TIN on official e-Trade registry
                    </span>
                  </label>
                  <p className="text-[11px] text-emerald-800/80 mt-1 pl-6">
                    Mandatory verification required before granting flash deal publication permissions.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={() => rejectShop(shop.id)}
                    className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveShop(shop.id)}
                    disabled={!shop.eTradeVerified}
                    className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    Approve Shop
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: REFUNDS DUE */}
      {activeAdminTab === 'refunds' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm text-xs text-slate-600 leading-relaxed flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-slate-900 block mb-0.5">Automated No-Show Guarantee Policy:</strong>
              When a customer completes cashless M-PESA payment but does not pick up their order before counter expiration, the voucher automatically queues a B2C reversal back to the customer&apos;s phone.
            </div>
          </div>

          {refundsDue.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Zero refunds due</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All paid customer claims were redeemed within the merchant pickup window.
              </p>
            </div>
          ) : (
            refundsDue.map((claim) => (
              <div
                key={claim.id}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-3.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      Receipt: {claim.mpesaReceipt || 'NLJ7RT61SV'}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">{claim.dealTitle}</h4>
                    <p className="text-xs text-slate-500">{claim.shopName} · Code: {claim.redemptionCode}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-rose-700 tabular-nums">
                      {claim.finalPrice} ETB
                    </span>
                    <span className="block text-[10px] text-amber-800 font-bold">Unredeemed</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600">
                  Customer Phone: <span className="font-mono font-semibold text-slate-900">{claim.customerPhone}</span>
                </div>

                <button
                  onClick={() => completeRefund(claim.id)}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Mark Refund Completed (via Safaricom M-PESA B2C)
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: USER REPORTS */}
      {activeAdminTab === 'reports' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm text-xs text-slate-600 leading-relaxed flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-slate-900 block mb-0.5">Community Flagging Rule:</strong>
              Deals reported 3 times are immediately hidden from customer feeds to preserve honest discounts and verified stock.
            </div>
          </div>

          {reportedDeals.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No active reports</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Platform listings are currently verified with zero unresolved flags.
              </p>
            </div>
          ) : (
            reportedDeals.map((report, idx) => (
              <div
                key={idx}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{report.dealTitle}</h4>
                    <p className="text-xs text-slate-500">{report.shopName}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                    Flagged
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-700 border border-slate-100">
                  <span className="font-semibold text-slate-900">Reason:</span> {report.reason}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Reported by: {report.reporterIpOrId}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
