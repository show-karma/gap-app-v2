"use client";

import { CreditCard, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { OnrampProvider, type StripeOnrampSessionData } from "@/hooks/donation/types";
import { useOnramp } from "@/hooks/donation/useOnramp";
import { useCountryDetection } from "@/hooks/useCountryDetection";
import { getCurrencyForCountry, getProviderConfig, isCountrySupported } from "@/lib/onramp";
import { getChainNameById } from "@/utilities/network";
import { OnrampSuccessModal } from "./OnrampSuccessModal";

const StripeOnrampEmbed = dynamic(
  () => import("./StripeOnrampEmbed").then((m) => m.StripeOnrampEmbed),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
      </div>
    ),
  }
);

const ONRAMP_LIMITS = {
  MIN_AMOUNT: 10,
  MAX_AMOUNT: 10000,
  MAX_DECIMALS: 2,
} as const;

/** Regex for validating decimal amounts - moved to module scope to avoid recreation */
const DECIMAL_REGEX = new RegExp(`^\\d*\\.?\\d{0,${ONRAMP_LIMITS.MAX_DECIMALS}}$`);

interface OnrampFlowProps {
  projectUid: string;
  payoutAddress: string;
  chainId: number;
  initialAmount?: string;
  onDonationComplete?: () => void;
}

export const OnrampFlow = React.memo<OnrampFlowProps>(
  ({ projectUid, payoutAddress, chainId, initialAmount, onDonationComplete }) => {
    const [amount, setAmount] = useState(initialAmount || "");
    const donationUidRef = useRef<string | null>(null);
    const selectedProvider = OnrampProvider.STRIPE;
    const [successSessionData, setSuccessSessionData] = useState<StripeOnrampSessionData | null>(
      null
    );

    const { country, isLoading: isCountryLoading } = useCountryDetection();
    const isCountryAllowed = useMemo(() => isCountrySupported(country), [country]);
    const currency = useMemo(() => getCurrencyForCountry(country), [country]);

    const providerConfig = useMemo(() => getProviderConfig(selectedProvider), [selectedProvider]);

    const { network, isChainSupported } = useMemo(() => {
      const chainName = getChainNameById(chainId);
      const supported = providerConfig.supportedNetworks.includes(chainName);
      return { network: chainName, isChainSupported: supported };
    }, [chainId, providerConfig.supportedNetworks]);

    const { initiateOnramp, isLoading, session, clearSession } = useOnramp({
      projectUid,
      payoutAddress,
      network,
      targetAsset: "USDC",
      provider: selectedProvider,
      country,
    });

    const handleStripeSuccess = useCallback(
      (sessionData: StripeOnrampSessionData) => {
        donationUidRef.current = session?.donationUid ?? null;
        clearSession();
        setSuccessSessionData(sessionData);
      },
      [clearSession, session?.donationUid]
    );

    const handleSuccessModalClose = useCallback(() => {
      setSuccessSessionData(null);
      setAmount("");
      donationUidRef.current = null;
      onDonationComplete?.();
    }, [onDonationComplete]);

    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === "" || DECIMAL_REGEX.test(value)) {
        setAmount(value);
      }
    }, []);

    const { validationError, isValidAmount } = useMemo(() => {
      if (!amount) return { validationError: null, isValidAmount: false };
      const numAmount = parseFloat(amount);
      if (Number.isNaN(numAmount)) {
        return { validationError: "Please enter a valid amount", isValidAmount: false };
      }
      if (numAmount < ONRAMP_LIMITS.MIN_AMOUNT) {
        return {
          validationError: `Minimum amount is ${ONRAMP_LIMITS.MIN_AMOUNT}`,
          isValidAmount: false,
        };
      }
      if (numAmount > ONRAMP_LIMITS.MAX_AMOUNT) {
        return {
          validationError: `Maximum amount is ${ONRAMP_LIMITS.MAX_AMOUNT.toLocaleString()}`,
          isValidAmount: false,
        };
      }
      return { validationError: null, isValidAmount: true };
    }, [amount]);

    const handleProceed = useCallback(() => {
      if (!isValidAmount) return;
      initiateOnramp(parseFloat(amount), currency.code);
    }, [isValidAmount, initiateOnramp, amount, currency.code]);

    return (
      <div className="space-y-4">
        {session && selectedProvider === OnrampProvider.STRIPE && (
          <StripeOnrampEmbed
            clientSecret={session.clientSecret}
            onClose={clearSession}
            onSuccess={handleStripeSuccess}
          />
        )}

        {successSessionData && (
          <OnrampSuccessModal
            sessionData={successSessionData}
            network={network}
            donationUid={donationUidRef.current}
            chainId={chainId}
            onClose={handleSuccessModalClose}
          />
        )}

        <div className="space-y-2">
          <label
            htmlFor="fiat-amount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Amount ({currency.code})
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              {currency.symbol}
            </span>
            <input
              id="fiat-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              aria-describedby={validationError ? "fiat-amount-error" : "fiat-amount-hint"}
              aria-invalid={validationError ? "true" : undefined}
              className="w-full rounded-md border border-gray-300 bg-white pl-7 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          {validationError ? (
            <p id="fiat-amount-error" role="alert" className="text-xs text-red-500">
              {validationError}
            </p>
          ) : (
            <p id="fiat-amount-hint" className="text-xs text-gray-500 dark:text-gray-400">
              Min: {currency.symbol}
              {ONRAMP_LIMITS.MIN_AMOUNT} · Max: {currency.symbol}
              {ONRAMP_LIMITS.MAX_AMOUNT.toLocaleString()}
            </p>
          )}
        </div>

        {!isChainSupported && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
            Card payments are not available for this network.
          </div>
        )}

        {!isCountryLoading && !isCountryAllowed && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
            Card payments are not available in your region at this time. This service is currently
            only available in the US and EU.
          </div>
        )}

        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-800">
          <p className="font-medium mb-2">How this works:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
            <li>Complete your payment in the secure {providerConfig.name} form below</li>
            <li>Your card payment is used to purchase USDC</li>
            <li>
              Funds are sent directly to:{" "}
              <code className="bg-blue-100 dark:bg-blue-800/50 px-1 py-0.5 rounded text-xs font-mono">
                {payoutAddress.slice(0, 6)}...{payoutAddress.slice(-4)}
              </code>
            </li>
          </ol>
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            This is the project&apos;s verified receiving address. No intermediary involved.
          </p>
        </div>

        <Button
          onClick={handleProceed}
          disabled={
            !isValidAmount ||
            isLoading ||
            !payoutAddress ||
            !isChainSupported ||
            isCountryLoading ||
            !isCountryAllowed
          }
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
