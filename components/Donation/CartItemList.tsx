"use client"
import type { SupportedToken } from "@/constants/supportedTokens"
import { CartItemRow } from "./CartItemRow"

/**
 * Get token options including the currently selected token if not in the list
 */
function getTokenOptionsWithSelected(
  allAvailableTokens: SupportedToken[],
  selectedToken?: SupportedToken
): SupportedToken[] {
  const base = [...allAvailableTokens]

  if (
    selectedToken &&
    !base.some(
      (token) => token.symbol === selectedToken.symbol && token.chainId === selectedToken.chainId
    )
  ) {
    base.push(selectedToken)
  }

  return base
}

interface CartItem {
  uid: string
  slug?: string
  title: string
  imageURL?: string
}

interface PayoutInfo {
  address?: string
  isLoading: boolean
  isMissing: boolean
}

interface CartItemListProps {
  items: CartItem[]
  selectedTokens: Record<string, SupportedToken>
  amounts: Record<string, string>
  payoutStatusByProject: Record<string, PayoutInfo>
  allAvailableTokens: SupportedToken[]
  balanceByTokenKey: Record<string, string>
  formatAddress: (address?: string) => string
  onTokenSelect: (projectId: string, token: SupportedToken) => void
  onAmountChange: (projectId: string, amount: string) => void
  onRemove: (projectId: string) => void
}

export function CartItemList({
  items,
  selectedTokens,
  amounts,
  payoutStatusByProject,
  allAvailableTokens,
  balanceByTokenKey,
  formatAddress,
  onTokenSelect,
  onAmountChange,
  onRemove,
}: CartItemListProps) {
  return (
    <div className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-3 items-center px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <div className="col-span-4">Project</div>
        <div className="col-span-4">Payment Token</div>
        <div className="col-span-3 text-right">Amount</div>
        <div className="col-span-1"></div>
      </div>

      {items.map((item) => {
        const selectedToken = selectedTokens[item.uid]
        const currentAmount = amounts[item.uid] || ""
        const payoutInfo = payoutStatusByProject[item.uid]
        const tokenOptions = getTokenOptionsWithSelected(allAvailableTokens, selectedToken)

        return (
          <CartItemRow
            key={item.uid}
            item={item}
            selectedToken={selectedToken}
            currentAmount={currentAmount}
            payoutInfo={payoutInfo}
            tokenOptions={tokenOptions}
            balanceByTokenKey={balanceByTokenKey}
            formatAddress={formatAddress}
            onTokenSelect={(token) => onTokenSelect(item.uid, token)}
            onAmountChange={(amount) => onAmountChange(item.uid, amount)}
            onRemove={() => onRemove(item.uid)}
          />
        )
      })}
    </div>
  )
}
