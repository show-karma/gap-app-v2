"use client";

import { useQuery } from "@tanstack/react-query";
import { type DonationApiResponse, DonationStatus } from "@/hooks/donation/types";
import { donationsService } from "@/services/donations.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

const POLLING_INTERVAL_MS = 5000;

const isTerminalStatus = (s?: DonationStatus | null) =>
  s === DonationStatus.COMPLETED || s === DonationStatus.FAILED;

interface UseDonationPollingParams {
  donationUid: string | null;
  chainId: number;
}

interface UseDonationPollingReturn {
  donation: DonationApiResponse | null;
  isPolling: boolean;
  status: DonationStatus | null;
  error: Error | null;
}

export const useDonationPolling = ({
  donationUid,
  chainId,
}: UseDonationPollingParams): UseDonationPollingReturn => {
  const { data, isFetching, error } = useQuery<DonationApiResponse>({
    queryKey: QUERY_KEYS.DONATIONS.POLLING(donationUid!, chainId),
    queryFn: () => donationsService.getDonationByUid(donationUid!, chainId),
    enabled: !!donationUid,
    refetchInterval: (q) => (isTerminalStatus(q.state.data?.status) ? false : POLLING_INTERVAL_MS),
    refetchOnWindowFocus: (q) => !isTerminalStatus(q.state.data?.status),
    refetchOnReconnect: (q) => !isTerminalStatus(q.state.data?.status),
    refetchOnMount: (q) => !isTerminalStatus(q.state.data?.status),
    retry: false,
  });

  const status = data?.status ?? null;
  const isPolling = !!donationUid && isFetching && !isTerminalStatus(status);

  return {
    donation: data ?? null,
    isPolling,
    status,
    error: error ?? null,
  };
};
