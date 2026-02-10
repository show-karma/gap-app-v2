"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type DonationApiResponse,
  DonationStatus,
  type DonationStatusApiResponse,
} from "@/hooks/donation/types";
import { donationsService } from "@/services/donations.service";

const POLLING_INTERVAL_MS = 5000;

interface UseDonationPollingParams {
  donationUid: string | null;
  chainId: number;
  pollingToken?: string;
}

interface UseDonationPollingReturn {
  donation: DonationApiResponse | DonationStatusApiResponse | null;
  isPolling: boolean;
  status: DonationStatus | null;
  error: Error | null;
}

export const useDonationPolling = ({
  donationUid,
  chainId,
  pollingToken,
}: UseDonationPollingParams): UseDonationPollingReturn => {
  const { data, isFetching, error } = useQuery<DonationApiResponse | DonationStatusApiResponse>({
    queryKey: pollingToken
      ? ["donation-status", donationUid, chainId, pollingToken]
      : ["donation", donationUid, chainId],
    queryFn: () =>
      pollingToken
        ? donationsService.getDonationStatus(donationUid!, chainId, pollingToken)
        : donationsService.getDonationByUid(donationUid!, chainId),
    enabled: !!donationUid,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (s === DonationStatus.COMPLETED || s === DonationStatus.FAILED) {
        return false;
      }
      return POLLING_INTERVAL_MS;
    },
    retry: false,
  });

  const status = (data?.status as DonationStatus) ?? null;
  const isTerminal = status === DonationStatus.COMPLETED || status === DonationStatus.FAILED;
  const isPolling = !!donationUid && isFetching && !isTerminal;

  return {
    donation: data ?? null,
    isPolling,
    status,
    error: error ?? null,
  };
};
