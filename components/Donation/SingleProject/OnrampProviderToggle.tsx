"use client";

import React, { useCallback } from "react";
import { OnrampProvider } from "@/hooks/donation/types";
import { getProviderConfig } from "@/lib/onramp";
import { cn } from "@/utilities/tailwind";

interface OnrampProviderToggleProps {
  selected: OnrampProvider;
  onSelect: (provider: OnrampProvider) => void;
}

const PROVIDER_OPTIONS = [
  { id: OnrampProvider.STRIPE, label: "Stripe" },
  { id: OnrampProvider.COINBASE, label: "Coinbase" },
] as const;

export const OnrampProviderToggle = React.memo<OnrampProviderToggleProps>(
  ({ selected, onSelect }) => {
    const handleSelect = useCallback(
      (provider: OnrampProvider) => {
        onSelect(provider);
      },
      [onSelect]
    );

    return (
      <div className="space-y-2">
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Payment Provider
        </span>
        <div className="flex rounded-lg border border-gray-200 dark:border-zinc-700 p-1 bg-gray-50 dark:bg-zinc-800/50">
          {PROVIDER_OPTIONS.map((option) => {
            const config = getProviderConfig(option.id);
            const isSelected = selected === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className={cn(
                  "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200",
                  isSelected
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                )}
                aria-pressed={isSelected}
              >
                {config.name}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {getProviderConfig(selected).description}
        </p>
      </div>
    );
  }
);

OnrampProviderToggle.displayName = "OnrampProviderToggle";
