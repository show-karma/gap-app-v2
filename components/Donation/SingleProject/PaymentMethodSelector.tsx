"use client";

import { CreditCard, Zap } from "lucide-react";
import React, { useCallback } from "react";
import { getDefaultProvider } from "@/lib/onramp";
import { PaymentMethod } from "@/types/donations";
import type { PaymentMethodSelectorProps } from "./types";

const defaultProvider = getDefaultProvider();

export const PaymentMethodSelector = React.memo<PaymentMethodSelectorProps>(
  ({ selected, onSelect }) => {
    const handleCryptoSelect = useCallback(() => {
      onSelect(PaymentMethod.CRYPTO);
    }, [onSelect]);

    const handleFiatSelect = useCallback(() => {
      onSelect(PaymentMethod.FIAT);
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
          onClick={handleFiatSelect}
          aria-pressed={selected === PaymentMethod.FIAT}
          aria-label="Pay with card"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleFiatSelect();
            }
          }}
          className={`flex-1 p-3 rounded-lg border transition-colors ${
            selected === PaymentMethod.FIAT
              ? "border-brand-blue bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                selected === PaymentMethod.FIAT
                  ? "bg-brand-blue text-white"
                  : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
              }`}
            >
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div
                className={`font-medium text-sm ${
                  selected === PaymentMethod.FIAT
                    ? "text-brand-blue dark:text-blue-400"
                    : "text-gray-700 dark:text-zinc-300"
                }`}
              >
                Card
              </div>
            </div>
          </div>
        </button>
      </div>
    );
  }
);

PaymentMethodSelector.displayName = "PaymentMethodSelector";
