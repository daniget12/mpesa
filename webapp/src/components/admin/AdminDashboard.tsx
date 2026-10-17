'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/MiniAppContext';
import { 
  CheckCircle2, 
  MapPin 
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
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-slate-900">
          Admin Trust & Compliance
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Verify merchant trade licenses, review community flags, and audit automated M-PESA reversals.
        </p>
      </div>

      {/* Admin Subtabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setActiveAdminTab('pending')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all min-h-[36px] ${
            activeAdminTab === 'pending'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Shop Approvals ({pendingShops.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('refunds')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all min-h-[36px] ${
            activeAdminTab === 'refunds'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Refunds Due ({refundsDue.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('reports')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all min-h-[36px] ${
            activeAdminTab === 'reports'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Reports ({reportedDeals.length})
        </button>
      </div>

      {/* TAB 1: PENDING SHOP APPROVALS */}
      {activeAdminTab === 'pending' && (
        <div className="space-y-3">
          {pendingShops.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Queue is clear</h3>
              <p className="text-xs text-slate-500 mt-1">All shop registrations have been reviewed and approved.</p>
            </div>
          ) : (
            pendingShops.map((shop) => (
              <div
                key={shop.id}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-950">{shop.name}</h4>
                    <span className="text-xs text-slate-500 font-medium">{shop.category} · Bole</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    Pending e-Trade
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">TIN Number (Required)</span>
                    <span className="font-bold text-slate-900">{shop.tinNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">M-PESA Till</span>
                    <span className="font-bold text-slate-900">{shop.tillNumber || 'None provided'}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{shop.address}</span>
                </div>

                {/* The Required e-Trade Checkbox */}
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shop.eTradeVerified || false}
                      onChange={(e) => verifyShopOnEtrade(shop.id, e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-700 accent-emerald-700"
                    />
                    <span className="text-xs font-bold text-emerald-950">
                      I checked this TIN on e-Trade registry
                    </span>
                  </label>
                  <p className="text-[11px] text-emerald-800/80 mt-1 pl-6">
                    Required verification before enabling deal posting permissions.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => rejectShop(shop.id)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveShop(shop.id)}
                    disabled={!shop.eTradeVerified}
                    className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow transition-all disabled:opacity-40 disabled:pointer-events-none"
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
          <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed">
            <strong>Automated No-Show Guarantee:</strong> When a customer pays with M-PESA but fails to pick up their order during the pickup window, the voucher expires and queues a refund via M-PESA Reversal.
          </div>

          {refundsDue.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Zero refunds due</h3>
              <p className="text-xs text-slate-500 mt-1">All paid customer claims were redeemed within the pickup window.</p>
            </div>
          ) : (
            refundsDue.map((claim) => (
              <div
                key={claim.id}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3"
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
                  Customer Phone: <span className="font-mono font-semibold">{claim.customerPhone}</span>
                </div>

                <button
                  onClick={() => completeRefund(claim.id)}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Mark Refund Completed (via M-PESA)
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: USER REPORTS */}
      {activeAdminTab === 'reports' && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed">
            <strong>Community Flagging Rule:</strong> Deals reported 3 times are immediately hidden from all customer feeds to maintain trusted pricing.
          </div>

          {reportedDeals.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No active reports</h3>
              <p className="text-xs text-slate-500 mt-1">Platform listings are currently verified with zero unresolved flags.</p>
            </div>
          ) : (
            reportedDeals.map((report, idx) => (
              <div
                key={idx}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{report.dealTitle}</h4>
                    <p className="text-xs text-slate-500">{report.shopName}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                    Flagged
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700">
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
