"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type DonationApiResponse,
  DonationStatus,
  type DonationStatusApiResponse,
} from "@/hooks/donation/types";
import { donationsService } from "@/services/donations.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

const POLLING_INTERVAL_MS = 5000;

const DONATION_STATUS_VALUES = new Set<string>(Object.values(DonationStatus));

const toDonationStatus = (s?: string | null): DonationStatus | null =>
  s && DONATION_STATUS_VALUES.has(s) ? (s as DonationStatus) : null;

const isTerminalStatus = (s?: string | null) =>
  s === DonationStatus.COMPLETED || s === DonationStatus.FAILED;

interface UseDonationPollingParams {
  donationUid: string | null;
  chainId: number;
  pollingToken?: string | null;
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
      ? QUERY_KEYS.DONATIONS.STATUS(donationUid!, chainId)
      : QUERY_KEYS.DONATIONS.POLLING(donationUid!, chainId),
    queryFn: () =>
      pollingToken
        ? donationsService.getDonationStatus(donationUid!, chainId, pollingToken)
        : donationsService.getDonationByUid(donationUid!, chainId),
    enabled: !!donationUid,
    refetchInterval: (q) => (isTerminalStatus(q.state.data?.status) ? false : POLLING_INTERVAL_MS),
    refetchOnWindowFocus: (q) => !isTerminalStatus(q.state.data?.status),
    refetchOnReconnect: (q) => !isTerminalStatus(q.state.data?.status),
    refetchOnMount: (q) => !isTerminalStatus(q.state.data?.status),
    retry: false,
  });

  const status = toDonationStatus(data?.status);
  const isPolling = !!donationUid && isFetching && !isTerminalStatus(status);

  return {
    donation: data ?? null,
    isPolling,
    status,
    error: error ?? null,
  };
};
