import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/utilities/queryKeys';
import { donationsService } from '@/services/donations.service';
import type { Hex } from 'viem';

export const useDonationHistory = (walletAddress: Hex | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.DONATIONS.BY_USER(walletAddress || ''),
    queryFn: async () => {
      if (!walletAddress) return [];
      return donationsService.getUserDonations(walletAddress);
    },
    enabled: !!walletAddress,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000
  });
};
