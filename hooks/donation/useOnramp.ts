"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import type { OnrampProvider, OnrampSessionRequest } from "@/hooks/donation/types";
import { DEFAULT_ONRAMP_PROVIDER, getProviderConfig } from "@/lib/onramp";
import { donationsService } from "@/services/donations.service";

interface UseOnrampParams {
  projectUid: string;
  payoutAddress: string;
  network: string;
  targetAsset: string;
  redirectUrl?: string;
  provider?: OnrampProvider;
  onError?: (error: Error) => void;
}

interface UseOnrampReturn {
  initiateOnramp: (fiatAmount: number, fiatCurrency: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export const useOnramp = ({
  projectUid,
  payoutAddress,
  network,
  targetAsset,
  redirectUrl,
  provider = DEFAULT_ONRAMP_PROVIDER,
  onError,
}: UseOnrampParams): UseOnrampReturn => {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const providerConfig = getProviderConfig(provider);

  const initiateOnramp = useCallback(
    async (fiatAmount: number, fiatCurrency: string) => {
      if (!payoutAddress) {
        const err = new Error("Payout address is required");
        setError(err);
        onError?.(err);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const request: OnrampSessionRequest = {
          provider,
          projectUid,
          payoutAddress,
          fiatAmount,
          fiatCurrency,
          network,
          targetAsset,
          donorAddress: address,
        };

        const sessionResponse = await donationsService.createOnrampSession(request);

        const onrampUrl = providerConfig.buildUrl({
          token: sessionResponse.sessionToken,
          fiatAmount,
          fiatCurrency,
          asset: targetAsset,
          redirectUrl,
        });
        window.open(onrampUrl, "_blank", "noopener,noreferrer");

        toast.success(`Redirecting to ${providerConfig.name}...`);
        setIsLoading(false);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to create onramp session");
        console.error("Onramp session creation failed:", error);
        setError(error);
        setIsLoading(false);
        toast.error(error.message);
        onError?.(error);
      }
    },
    [
      projectUid,
      payoutAddress,
      network,
      targetAsset,
      redirectUrl,
      provider,
      providerConfig,
      address,
      onError,
    ]
  );

  return {
    initiateOnramp,
    isLoading,
    error,
  };
};
