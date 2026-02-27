import { useQuery } from "@tanstack/react-query";
import { donationsService } from "@/services/donations.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseDonationHistoryOptions {
  enabled?: boolean;
}

export const useDonationHistory = (options: UseDonationHistoryOptions = {}) => {
  const { enabled = true } = options;
  return useQuery({
    queryKey: QUERY_KEYS.DONATIONS.MY(),
    queryFn: () => donationsService.getMyDonations(),
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    enabled,
  });
};
