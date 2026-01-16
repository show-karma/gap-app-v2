"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { OnrampError } from "@/hooks/donation/onramp-errors";
import type { OnrampProvider, OnrampSessionRequest } from "@/hooks/donation/types";
import { ALLOWED_ONRAMP_DOMAINS, DEFAULT_ONRAMP_PROVIDER, getProviderConfig } from "@/lib/onramp";
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

        // Include partnerUserRef (donationUid) in redirect URL for status tracking
        // Use URL API to properly handle existing query params
        const redirectWithRef = redirectUrl
          ? (() => {
              const url = new URL(redirectUrl);
              url.searchParams.set("onrampRef", sessionResponse.donationUid);
              return url.toString();
            })()
          : undefined;

        const onrampUrl = providerConfig.buildUrl({
          token: sessionResponse.sessionToken,
          fiatAmount,
          fiatCurrency,
          asset: targetAsset,
          redirectUrl: redirectWithRef,
          partnerUserRef: sessionResponse.donationUid,
        });

        // Validate URL before opening
        const isValidUrl = (() => {
          try {
            const parsed = new URL(onrampUrl);
            return ALLOWED_ONRAMP_DOMAINS.some((domain) => parsed.hostname === domain);
          } catch {
            return false;
          }
        })();

        if (!isValidUrl) {
          throw OnrampError.invalidUrl();
        }

        window.open(onrampUrl, "_blank", "noopener,noreferrer");

        toast.success(`Redirecting to ${providerConfig.name}...`);
        setIsLoading(false);
      } catch (err) {
        const error =
          err instanceof OnrampError
            ? err
            : err instanceof Error
              ? OnrampError.sessionCreationFailed(err.message)
              : OnrampError.sessionCreationFailed();
        console.error("Onramp session creation failed:", error);
        setError(error);
        setIsLoading(false);
        toast.error(error.userMessage);
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
