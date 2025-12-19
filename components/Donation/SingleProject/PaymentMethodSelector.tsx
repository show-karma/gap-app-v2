"use client";

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
          className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
            selected === PaymentMethod.CRYPTO
              ? "border-brand-blue bg-brand-lightblue dark:bg-blue-900/20 shadow-sm"
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
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
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
          className="flex-1 p-4 rounded-xl border-2 border-gray-200 dark:border-zinc-700 opacity-60 cursor-not-allowed relative"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-zinc-700 text-gray-400 dark:text-gray-500">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
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
