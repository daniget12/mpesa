import { LucideIcon, Package, ShoppingBag, Users, FileText, Receipt } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-emerald-500" />
      </div>
      <h3 className="text-xl font-bold text-black mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export function NoDealsAvailable({ onCreateDeal }: { onCreateDeal?: () => void }) {
  return (
    <EmptyState
      icon={Package}
      title="No Deals Available"
      description="There are no active deals at the moment. Check back soon or create your first deal!"
      action={onCreateDeal ? {
        label: 'Create Deal',
        onClick: onCreateDeal
      } : undefined}
    />
  )
}

export function NoOrdersYet() {
  return (
    <EmptyState
      icon={ShoppingBag}
      title="No Orders Yet"
      description="You haven't received any orders yet. When customers redeem vouchers, they'll appear here."
    />
  )
}

export function NoMerchantsYet({ onInviteMerchant }: { onInviteMerchant?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No Merchants Registered"
      description="No merchants have joined the platform yet. Start inviting merchants to grow your network."
      action={onInviteMerchant ? {
        label: 'Invite Merchant',
        onClick: onInviteMerchant
      } : undefined}
    />
  )
}

export function NoClaimsYet({ onBrowseDeals }: { onBrowseDeals?: () => void }) {
  return (
    <EmptyState
      icon={Receipt}
      title="No Vouchers Yet"
      description="You haven't claimed any vouchers yet. Browse available deals and start saving!"
      action={onBrowseDeals ? {
        label: 'Browse Deals',
        onClick: onBrowseDeals
      } : undefined}
    />
  )
}

export function NoSearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon={FileText}
      title="No Results Found"
      description={`No deals match "${query}". Try different keywords or browse all deals.`}
    />
  )
}
