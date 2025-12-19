"use client";

import { CreditCard, Zap } from "lucide-react";
import React, { useCallback } from "react";
import { PaymentMethod } from "@/types/donations";
import type { PaymentMethodSelectorProps } from "./types";

export const PaymentMethodSelector = React.memo<PaymentMethodSelectorProps>(
  ({ selected, onSelect }) => {
    const handleCryptoSelect = useCallback(() => {
      onSelect(PaymentMethod.CRYPTO);
    }, [onSelect]);

    return (
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCryptoSelect}
          aria-pressed={selected === PaymentMethod.CRYPTO}
          aria-label="Pay with cryptocurrency"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleCryptoSelect();
            }
          }}
          className={`flex-1 p-3 rounded-lg border transition-colors ${
            selected === PaymentMethod.CRYPTO
              ? "border-brand-blue bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selected === PaymentMethod.CRYPTO
                  ? "bg-brand-blue text-white"
                  : "bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div
                className={`font-semibold text-sm ${
                  selected === PaymentMethod.CRYPTO
                    ? "text-brand-blue dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                Crypto
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Use wallet</div>
            </div>
          </div>
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="Pay with card - Coming soon"
          className="flex-1 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 opacity-60 cursor-not-allowed"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-zinc-700 text-gray-400 dark:text-gray-500">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-gray-400 dark:text-gray-500">Card</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">Credit / Debit</div>
              <span className="text-[10px] bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-zinc-300 px-1.5 py-0.5 rounded-full font-medium">
                Coming soon
              </span>
            </div>
          </div>
        </button>
      </div>
    );
  }
);

PaymentMethodSelector.displayName = "PaymentMethodSelector";
