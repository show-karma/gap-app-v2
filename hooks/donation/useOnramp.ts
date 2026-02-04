"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { OnrampError } from "@/hooks/donation/onramp-errors";
import type { OnrampProvider, OnrampSessionRequest } from "@/hooks/donation/types";
import { DEFAULT_ONRAMP_PROVIDER } from "@/lib/onramp";
import { donationsService } from "@/services/donations.service";

interface UseOnrampParams {
  projectUid: string;
  payoutAddress: string;
  network: string;
  targetAsset: string;
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
        };

        const sessionResponse = await donationsService.createOnrampSession(request);

        // Check if component is still mounted before updating state
        if (!mountedRef.current) return;

        // Use Stripe embedded widget
        setSession({
          clientSecret: sessionResponse.sessionToken,
          donationUid: sessionResponse.donationUid,
        });
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
    [projectUid, payoutAddress, network, targetAsset, provider, address, country, onError]
  );

  return {
    initiateOnramp,
    isLoading,
    error,
    session,
    clearSession,
  };
};
