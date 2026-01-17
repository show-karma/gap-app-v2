"use client";

import { CreditCard, Loader2 } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { OnrampProvider } from "@/hooks/donation/types";
import { useOnramp } from "@/hooks/donation/useOnramp";
import { DEFAULT_ONRAMP_PROVIDER, getProviderConfig } from "@/lib/onramp";
import { getChainNameById } from "@/utilities/network";

const ONRAMP_LIMITS = {
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 10000,
  MAX_DECIMALS: 2,
} as const;

interface OnrampFlowProps {
  projectUid: string;
  payoutAddress: string;
  chainId: number;
  provider?: OnrampProvider;
}

export const OnrampFlow = React.memo<OnrampFlowProps>(
  ({ projectUid, payoutAddress, chainId, provider = DEFAULT_ONRAMP_PROVIDER }) => {
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("USD");

    const providerConfig = getProviderConfig(provider);

    const { network, isChainSupported } = useMemo(() => {
      const chainName = getChainNameById(chainId);
      const supported = providerConfig.supportedNetworks.includes(chainName);
      return { network: chainName, isChainSupported: supported };
    }, [chainId, providerConfig.supportedNetworks]);

    const redirectUrl = useMemo(() => {
      if (typeof window === "undefined") return undefined;
      return `${window.location.origin}/project/${projectUid}`;
    }, [projectUid]);

    const { initiateOnramp, isLoading } = useOnramp({
      projectUid,
      payoutAddress,
      network,
      targetAsset: "USDC",
      redirectUrl,
      provider,
    });

    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Allow numbers with up to MAX_DECIMALS decimal places
      const decimalRegex = new RegExp(`^\\d*\\.?\\d{0,${ONRAMP_LIMITS.MAX_DECIMALS}}$`);
      if (value === "" || decimalRegex.test(value)) {
        setAmount(value);
      }
    }, []);

    const handleCurrencyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      setCurrency(e.target.value);
    }, []);

    const validationError = useMemo(() => {
      if (!amount) return null;
      const numAmount = parseFloat(amount);
      if (Number.isNaN(numAmount)) return "Please enter a valid amount";
      if (numAmount < ONRAMP_LIMITS.MIN_AMOUNT)
        return `Minimum amount is ${ONRAMP_LIMITS.MIN_AMOUNT}`;
      if (numAmount > ONRAMP_LIMITS.MAX_AMOUNT)
        return `Maximum amount is ${ONRAMP_LIMITS.MAX_AMOUNT.toLocaleString()}`;
      return null;
    }, [amount]);

    const isValidAmount = useMemo(() => {
      const numAmount = parseFloat(amount);
      return (
        !Number.isNaN(numAmount) &&
        numAmount >= ONRAMP_LIMITS.MIN_AMOUNT &&
        numAmount <= ONRAMP_LIMITS.MAX_AMOUNT
      );
    }, [amount]);

    const handleProceed = useCallback(() => {
      if (!isValidAmount) return;
      initiateOnramp(parseFloat(amount), currency);
    }, [isValidAmount, initiateOnramp, amount, currency]);

    const currencySymbol = useMemo(
      () => providerConfig.supportedCurrencies.find((c) => c.code === currency)?.symbol || "$",
      [providerConfig.supportedCurrencies, currency]
    );

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="fiat-amount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Amount
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                {currencySymbol}
              </span>
              <input
                id="fiat-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                className="w-full rounded-md border border-gray-300 bg-white pl-7 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <select
              value={currency}
              onChange={handleCurrencyChange}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {providerConfig.supportedCurrencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
          {validationError ? (
            <p className="text-xs text-red-500">{validationError}</p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Min: {currencySymbol}
              {ONRAMP_LIMITS.MIN_AMOUNT} · Max: {currencySymbol}
              {ONRAMP_LIMITS.MAX_AMOUNT.toLocaleString()}
            </p>
          )}
        </div>

        {!isChainSupported && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
            Card payments are not available for this network.
          </div>
        )}

        <div className="rounded-lg bg-gray-50 dark:bg-zinc-800/50 p-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            You&apos;ll be redirected to {providerConfig.name} to complete your purchase. The crypto
            will be sent directly to the project&apos;s wallet.
          </p>
        </div>

        <Button
          onClick={handleProceed}
          disabled={!isValidAmount || isLoading || !payoutAddress || !isChainSupported}
          className="w-full bg-brand-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin h-4 w-4" />
              Creating session...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" />
              Continue to {providerConfig.name}
            </span>
          )}
        </Button>
      </div>
    );
  }
);

OnrampFlow.displayName = "OnrampFlow";
