import { useQuery } from "@tanstack/react-query";
import { JsonRpcProvider } from "ethers";
import { useEffect } from "react";
import type { Chain } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerStore } from "@/store/owner";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { gapSupportedNetworks } from "@/utilities/network";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";
import { getContractOwner } from "@/utilities/sdk/getContractOwner";

const fetchContractOwner = async (address: string): Promise<boolean> => {
  if (!address) return false;
  const chain = gapSupportedNetworks[0];
  const rpcUrl = getRPCUrlByChainId(chain.id);

  if (!rpcUrl) {
    throw new Error(`RPC URL not configured for chain ${chain.id}`);
  }

  const provider = new JsonRpcProvider(rpcUrl, {
    chainId: chain.id,
    name: chain.name,
  });

  const owner = await getContractOwner(provider, chain);
  return owner?.toLowerCase() === address?.toLowerCase();
};

export const useContractOwner = (chainOverride?: Chain) => {
  const { authenticated: isAuth, address } = useAuth();
  const { setIsOwner, setIsOwnerLoading } = useOwnerStore();
  const signer = useSigner();
  const chain = chainOverride || gapSupportedNetworks[0];

  const queryResult = useQuery<boolean, Error>({
    queryKey: ["contract-owner", address, chain?.id],
    queryFn: () =>
      fetchContractOwner(address!).catch(() => {
        return false;
      }),
    enabled: !!address && isAuth,
    staleTime: 10 * 60 * 1000, // 10 minutes - contract owner changes rarely
    gcTime: 10 * 60 * 1000, // Match staleTime for consistency
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, _error) => {
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
  });

  const { data, isLoading, error, refetch } = queryResult;

  // Sync with Zustand store
  useEffect(() => {
    setIsOwnerLoading(isLoading);
  }, [isLoading, setIsOwnerLoading]);

  useEffect(() => {
    if (!isAuth) {
      setIsOwner(false);
      return;
    }
    if (typeof data === "boolean") {
      setIsOwner(data);
    }
  }, [data, isAuth, setIsOwner]);

  useEffect(() => {
    if (error) {
      errorManager(`Error fetching contract owner for ${address}`, error, {
        signer,
        address,
        chain,
      });
      setIsOwner(false);
    }
  }, [error, address, signer, chain, setIsOwner]);

  return {
    ...queryResult,
    refetch,
  };
};
