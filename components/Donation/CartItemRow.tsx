"use client";
import Link from "next/link";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { PAGES } from "@/utilities/pages";
import type { SupportedToken } from "@/constants/supportedTokens";
import { TokenSelector } from "./TokenSelector";
import { PayoutAddressDisplay } from "./PayoutAddressDisplay";
import { BalanceDisplay } from "./BalanceDisplay";

interface CartItem {
  uid: string;
  slug?: string;
  title: string;
  imageURL?: string;
}

interface PayoutInfo {
  address?: string;
  isLoading: boolean;
  isMissing: boolean;
}

interface CartItemRowProps {
  item: CartItem;
  selectedToken?: SupportedToken;
  currentAmount: string;
  payoutInfo?: PayoutInfo;
  tokenOptions: SupportedToken[];
  balanceByTokenKey: Record<string, string>;
  formatAddress: (address?: string) => string;
  onTokenSelect: (token: SupportedToken) => void;
  onAmountChange: (amount: string) => void;
  onRemove: () => void;
}

export function CartItemRow({
  item,
  selectedToken,
  currentAmount,
  payoutInfo,
  tokenOptions,
  balanceByTokenKey,
  formatAddress,
  onTokenSelect,
  onAmountChange,
  onRemove,
}: CartItemRowProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-gray-200/60 bg-white/90 p-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md dark:border-gray-800/60 dark:bg-gray-900/90 dark:hover:border-blue-800">
      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Project Info - 4 columns */}
        <div className="col-span-4 flex items-center gap-3">
          <div className="relative">
            <ProfilePicture
              imageURL={item.imageURL}
              name={item.title}
              size="32"
              className="h-8 w-8 min-h-8 min-w-8 border border-white shadow-sm dark:border-gray-700"
              alt={item.title}
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border border-white dark:border-gray-900"></div>
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={PAGES.PROJECT.OVERVIEW(item.slug || item.uid)}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link inline-flex items-center gap-1.5"
            >
              <h3 className="text-sm font-semibold text-gray-900 transition group-hover/link:text-blue-600 dark:text-gray-100 dark:group-hover/link:text-blue-400 truncate">
                {item.title}
              </h3>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-400 transition group-hover/link:text-blue-500 group-hover/link:translate-x-0.5 dark:text-gray-500 flex-shrink-0"
              >
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </Link>
            <div className="flex items-center gap-1 mt-0.5">
              <PayoutAddressDisplay
                payoutInfo={payoutInfo}
                formatAddress={formatAddress}
              />
            </div>
          </div>
        </div>

        {/* Token Selection - 4 columns */}
        <TokenSelector
          selectedToken={selectedToken}
          tokenOptions={tokenOptions}
          balanceByTokenKey={balanceByTokenKey}
          onTokenSelect={onTokenSelect}
        />

        {/* Amount Input - 3 columns */}
        <div className="col-span-3">
          <div className="relative">
            <label htmlFor={`amount-${item.uid}`} className="sr-only">
              Donation amount for {item.title}
            </label>
            <input
              id={`amount-${item.uid}`}
              type="number"
              min="0"
              step="0.000001"
              value={currentAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.00"
              disabled={!selectedToken}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right text-sm font-mono font-semibold shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              aria-label={`Donation amount for ${item.title}${
                selectedToken ? ` in ${selectedToken.symbol}` : ""
              }`}
              aria-describedby={`balance-${item.uid}`}
              aria-invalid={
                currentAmount
                  ? parseFloat(currentAmount) <= 0
                  : undefined
              }
            />
            {selectedToken && (
              <div
                className="absolute inset-y-0 left-2 flex items-center"
                aria-hidden="true"
              >
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {selectedToken.symbol}
                </span>
              </div>
            )}
          </div>
          <div id={`balance-${item.uid}`}>
            <BalanceDisplay
              selectedToken={selectedToken}
              balanceByTokenKey={balanceByTokenKey}
            />
          </div>
        </div>

        {/* Remove Button - 1 column */}
        <div className="col-span-1 flex justify-end">
          <button
            onClick={onRemove}
            className="rounded-full border border-red-200 p-1.5 text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/20 dark:focus:ring-offset-gray-900"
            aria-label={`Remove ${item.title} from donation cart`}
            title={`Remove ${item.title}`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="m8 6-1 14h10L16 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
