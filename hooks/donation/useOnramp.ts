"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { OnrampError } from "@/hooks/donation/onramp-errors";
import { OnrampProvider, type OnrampSessionRequest } from "@/hooks/donation/types";
import { ALLOWED_ONRAMP_DOMAINS, DEFAULT_ONRAMP_PROVIDER, getProviderConfig } from "@/lib/onramp";
import { donationsService } from "@/services/donations.service";

/**
 * Validates that a URL belongs to an allowed onramp domain.
 * @param url - The URL to validate
 * @returns true if the URL is valid and belongs to an allowed domain
 */
export function isValidOnrampUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_ONRAMP_DOMAINS.some((domain) => parsed.hostname === domain);
  } catch {
    return false;
  }
}

interface UseOnrampParams {
  projectUid: string;
  payoutAddress: string;
  network: string;
  targetAsset: string;
  redirectUrl?: string;
  provider?: OnrampProvider;
  country?: string | null; // ISO 3166-1 alpha-2 code
  onError?: (error: Error) => void;
}

interface OnrampSession {
  clientSecret: string;
  donationUid: string;
}

interface UseOnrampReturn {
  initiateOnramp: (fiatAmount: number, fiatCurrency: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  session: OnrampSession | null;
  clearSession: () => void;
}

export const useOnramp = ({
  projectUid,
  payoutAddress,
  network,
  targetAsset,
  redirectUrl,
  provider = DEFAULT_ONRAMP_PROVIDER,
  country,
  onError,
}: UseOnrampParams): UseOnrampReturn => {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [session, setSession] = useState<OnrampSession | null>(null);
  const mountedRef = useRef(true);

  // Track component mount state to prevent setState after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const providerConfig = getProviderConfig(provider);

  const clearSession = useCallback(() => {
    setSession(null);
  }, []);

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
        // Build redirect URL with provider info for status lookup after redirect
        const buildRedirectUrl = () => {
          if (!redirectUrl) return undefined;
          const url = new URL(redirectUrl);
          url.searchParams.set("onrampProvider", provider);
          return url.toString();
        };

        const request: OnrampSessionRequest = {
          provider,
          projectUid,
          payoutAddress,
          fiatAmount,
          fiatCurrency,
          network,
          targetAsset,
          donorAddress: address,
          ...(country && { country }),
          // Include redirect URL for providers that support redirect (Transak)
          ...(provider === OnrampProvider.TRANSAK &&
            redirectUrl && { redirectUrl: buildRedirectUrl() }),
        };

        const sessionResponse = await donationsService.createOnrampSession(request);

        // Check if component is still mounted before updating state
        if (!mountedRef.current) return;

        // For Stripe, use embedded widget instead of redirect
        if (provider === OnrampProvider.STRIPE) {
          setSession({
            clientSecret: sessionResponse.sessionToken,
            donationUid: sessionResponse.donationUid,
          });
          setIsLoading(false);
          return;
        }

        // For Transak, redirect to onrampUrl
        if (provider === OnrampProvider.TRANSAK && sessionResponse.onrampUrl) {
          if (!isValidOnrampUrl(sessionResponse.onrampUrl)) {
            throw OnrampError.invalidUrl();
          }

          window.location.href = sessionResponse.onrampUrl;
          // Note: No state updates after redirect as component will unmount
          return;
        }

        // Fallback: build URL manually (for backwards compatibility)
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
        if (!isValidOnrampUrl(onrampUrl)) {
          throw OnrampError.invalidUrl();
        }

        window.open(onrampUrl, "_blank", "noopener,noreferrer");
        setIsLoading(false);
      } catch (err) {
        // Check if component is still mounted before updating state
        if (!mountedRef.current) return;

        const error =
          err instanceof OnrampError
            ? err
            : err instanceof Error
              ? OnrampError.sessionCreationFailed(err.message)
              : OnrampError.sessionCreationFailed();
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
      country,
      onError,
    ]
  );

  return {
    initiateOnramp,
    isLoading,
    error,
    session,
    clearSession,
  };
};
