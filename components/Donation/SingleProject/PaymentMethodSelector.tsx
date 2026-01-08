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
      <div className="flex gap-2">
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
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                selected === PaymentMethod.CRYPTO
                  ? "bg-brand-blue text-white"
                  : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
              }`}
            >
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div
                className={`font-medium text-sm ${
                  selected === PaymentMethod.CRYPTO
                    ? "text-brand-blue dark:text-blue-400"
                    : "text-gray-700 dark:text-zinc-300"
                }`}
              >
                Crypto
              </div>
              <div className="text-xs text-gray-500 dark:text-zinc-400">Use wallet</div>
            </div>
          </div>
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="Pay with card - Coming soon"
          className="flex-1 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 opacity-50 cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-medium text-sm text-gray-400 dark:text-zinc-500">Card</div>
              <div className="text-xs text-gray-400 dark:text-zinc-500">Coming soon</div>
            </div>
          </div>
        </button>
      </div>
    );
  }
);

PaymentMethodSelector.displayName = "PaymentMethodSelector";
