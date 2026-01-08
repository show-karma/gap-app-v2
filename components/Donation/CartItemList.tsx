"use client";
import type { SupportedToken } from "@/constants/supportedTokens";
import type { ChainPayoutAddressMap } from "@/src/features/chain-payout-address/types/chain-payout-address";
import { CartItemWithTokens } from "./CartItemWithTokens";

interface CartItem {
  uid: string;
  slug?: string;
  title: string;
  imageURL?: string;
}

interface CartItemListProps {
  items: CartItem[];
  selectedTokens: Record<string, SupportedToken>;
  amounts: Record<string, string>;
  chainPayoutAddresses: Record<string, ChainPayoutAddressMap>;
  allAvailableTokens: SupportedToken[];
  balanceByTokenKey: Record<string, string>;
  onTokenSelect: (projectId: string, token: SupportedToken) => void;
  onAmountChange: (projectId: string, amount: string) => void;
  onRemove: (projectId: string) => void;
}

export function CartItemList({
  items,
  selectedTokens,
  amounts,
  chainPayoutAddresses,
  allAvailableTokens,
  balanceByTokenKey,
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

      {items.map((item) => (
        <CartItemWithTokens
          key={item.uid}
          item={item}
          chainPayoutAddress={chainPayoutAddresses[item.uid]}
          selectedToken={selectedTokens[item.uid]}
          currentAmount={amounts[item.uid] || ""}
          allAvailableTokens={allAvailableTokens}
          balanceByTokenKey={balanceByTokenKey}
          onTokenSelect={(token) => onTokenSelect(item.uid, token)}
          onAmountChange={(amount) => onAmountChange(item.uid, amount)}
          onRemove={() => onRemove(item.uid)}
        />
      ))}
    </div>
  );
}
