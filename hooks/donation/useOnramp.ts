"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { OnrampError } from "@/hooks/donation/onramp-errors";
import type { OnrampProvider, OnrampSessionRequest } from "@/hooks/donation/types";
import { DEFAULT_ONRAMP_PROVIDER } from "@/lib/onramp";
import { donationsService } from "@/services/donations.service";
import { track } from "@/utilities/analytics/client";
import { toErrorCode } from "@/utilities/analytics/error-code";

/** Stable surface id for the fiat-to-crypto donation path. */
const ONRAMP_ENTRY_POINT = "donation_onramp";

interface UseOnrampParams {
  projectUid: string;
  payoutAddress: string;
  network: string;
  targetAsset: string;
  donorEmail?: string;
  provider?: OnrampProvider;
  country?: string | null;
  onError?: (error: Error) => void;
}

interface OnrampSession {
  clientSecret: string;
  donationUid: string;
  pollingToken: string;
}

interface InitiateOnrampParams {
  fiatAmount: number;
  fiatCurrency: string;
}

interface UseOnrampReturn {
  initiateOnramp: (fiatAmount: number, fiatCurrency: string) => void;
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
  donorEmail,
  provider = DEFAULT_ONRAMP_PROVIDER,
  country,
  onError,
}: UseOnrampParams): UseOnrampReturn => {
  const { address } = useAccount();

  const mutation = useMutation<OnrampSession, Error, InitiateOnrampParams>({
    mutationFn: async ({ fiatAmount, fiatCurrency }) => {
      if (!payoutAddress) {
        throw new Error("Payout address is required");
      }

      const request: OnrampSessionRequest = {
        provider,
        projectUid,
        payoutAddress,
        fiatAmount,
        fiatCurrency,
        network,
        targetAsset,
        donorAddress: address,
        ...(donorEmail?.trim() && { donorEmail: donorEmail.trim() }),
        ...(country && { country }),
      };

      track("donation_started", {
        project_count: 1,
        entry_point: ONRAMP_ENTRY_POINT,
        used_onramp: true,
      });

      const sessionResponse = await donationsService.createOnrampSession(request);

      return {
        clientSecret: sessionResponse.sessionToken,
        donationUid: sessionResponse.donationUid,
        pollingToken: sessionResponse.pollingToken,
      };
    },
    onError: (err) => {
      track("donation_failed", {
        project_count: 1,
        used_onramp: true,
        error_code: toErrorCode(err),
      });
      const error =
        err instanceof OnrampError
          ? err
          : err instanceof Error
            ? OnrampError.sessionCreationFailed(err.message)
            : OnrampError.sessionCreationFailed();
      toast.error(error.userMessage);
      onError?.(error);
    },
  });

  const initiateOnramp = useCallback(
    (fiatAmount: number, fiatCurrency: string) => {
      mutation.mutate({ fiatAmount, fiatCurrency });
    },
    [mutation]
  );

  const clearSession = useCallback(() => {
    mutation.reset();
  }, [mutation]);

  return {
    initiateOnramp,
    isLoading: mutation.isPending,
    error: mutation.error,
    session: mutation.data ?? null,
    clearSession,
  };
};
