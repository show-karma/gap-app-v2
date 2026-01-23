"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { OnrampError } from "@/hooks/donation/onramp-errors";
import { OnrampProvider, type OnrampSessionRequest } from "@/hooks/donation/types";
import { ALLOWED_ONRAMP_DOMAINS, DEFAULT_ONRAMP_PROVIDER, getProviderConfig } from "@/lib/onramp";
import { donationsService } from "@/services/donations.service";

interface UseOnrampParams {
  projectUid: string;
  payoutAddress: string;
  network: string;
  targetAsset: string;
  redirectUrl?: string;
  provider?: OnrampProvider;
  country?: string | null; // ISO 3166-1 alpha-2 code (required for Coinbase)
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

      // Country is required for Coinbase
      if (provider === OnrampProvider.COINBASE && !country) {
        const err = new Error("Country detection in progress");
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
          // Only include country for Coinbase
          ...(provider === OnrampProvider.COINBASE && country && { country }),
          // Include redirect URL for providers that support redirect (Coinbase, Transak)
          ...((provider === OnrampProvider.COINBASE || provider === OnrampProvider.TRANSAK) &&
            redirectUrl && { redirectUrl: buildRedirectUrl() }),
        };

        const sessionResponse = await donationsService.createOnrampSession(request);

        // For Stripe, use embedded widget instead of redirect
        if (provider === OnrampProvider.STRIPE) {
          setSession({
            clientSecret: sessionResponse.sessionToken,
            donationUid: sessionResponse.donationUid,
          });
          setIsLoading(false);
          return;
        }

        // For Coinbase, use the onrampUrl from the response (Quote-based flow)
        if (provider === OnrampProvider.COINBASE && sessionResponse.onrampUrl) {
          // Validate URL before opening
          const isValidUrl = (() => {
            try {
              const parsed = new URL(sessionResponse.onrampUrl!);
              return ALLOWED_ONRAMP_DOMAINS.some((domain) => parsed.hostname === domain);
            } catch {
              return false;
            }
          })();

          if (!isValidUrl) {
            throw OnrampError.invalidUrl();
          }

          // Open in same tab so Coinbase can redirect back to our app
          window.location.href = sessionResponse.onrampUrl;

          toast.success(`Redirecting to ${providerConfig.name}...`);
          setIsLoading(false);
          return;
        }

        // For Transak, redirect to onrampUrl (same pattern as Coinbase)
        if (provider === OnrampProvider.TRANSAK && sessionResponse.onrampUrl) {
          const isValidUrl = (() => {
            try {
              const parsed = new URL(sessionResponse.onrampUrl!);
              return ALLOWED_ONRAMP_DOMAINS.some((domain) => parsed.hostname === domain);
            } catch {
              return false;
            }
          })();

          if (!isValidUrl) {
            throw OnrampError.invalidUrl();
          }

          window.location.href = sessionResponse.onrampUrl;
          toast.success(`Redirecting to ${providerConfig.name}...`);
          setIsLoading(false);
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
