"use client";

import { useQuery } from "@tanstack/react-query";
import { type DonationApiResponse, DonationStatus } from "@/hooks/donation/types";
import { donationsService } from "@/services/donations.service";

const POLLING_INTERVAL_MS = 5000;

interface UseDonationPollingParams {
  donationUid: string | null;
  chainId: number;
}

interface UseDonationPollingReturn {
  donation: DonationApiResponse | null;
  isPolling: boolean;
  status: DonationStatus | null;
}

export const useDonationPolling = ({
  donationUid,
  chainId,
}: UseDonationPollingParams): UseDonationPollingReturn => {
  const { data, isFetching } = useQuery<DonationApiResponse>({
    queryKey: ["donation", donationUid, chainId],
    queryFn: () => donationsService.getDonationByUid(donationUid!, chainId),
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

  const status = data?.status ?? null;
  const isTerminal = status === DonationStatus.COMPLETED || status === DonationStatus.FAILED;
  const isPolling = !!donationUid && isFetching && !isTerminal;

  return {
    donation: data ?? null,
    isPolling,
    status: status as DonationStatus | null,
  };
};
