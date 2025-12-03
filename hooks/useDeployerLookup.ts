import { useQuery } from "@tanstack/react-query";
import { contractsService, type DeployerInfo } from "@/services/contracts.service";
import { QUERY_KEYS } from "@/utilities/queryKeys";

export type { DeployerInfo };

export interface UseDeployerLookupOptions {
  network: string;
  contractAddress: string;
  enabled?: boolean;
}

/**
 * Hook to lookup the deployer address of a smart contract using react-query
 */
export const useDeployerLookup = ({
  network,
  contractAddress,
  enabled = false,
}: UseDeployerLookupOptions) => {
  const query = useQuery({
    queryKey: QUERY_KEYS.CONTRACTS.DEPLOYER(network, contractAddress),
    queryFn: () => contractsService.lookupDeployer(network, contractAddress),
    enabled: enabled && !!network && !!contractAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  };
};
