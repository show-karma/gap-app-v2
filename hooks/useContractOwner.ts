import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type { Chain } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerStore } from "@/store/owner";
import { getLinkedWalletAddresses } from "@/utilities/auth/compare-all-wallets";
import { CONTRACT_OWNER_CACHE_CONFIG } from "@/utilities/cache-config";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { gapSupportedNetworks } from "@/utilities/network";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";
import { getContractOwner } from "@/utilities/sdk/getContractOwner";

// Resolve whether the EAS contract owner matches ANY of the supplied wallets.
// A single authenticated account can hold multiple wallets (e.g. several Privy
// embedded wallets); the owner role may sit on a non-active one, so checking
// only the active address can wrongly deny global-owner access.
const fetchIsContractOwner = async (addresses: string[]): Promise<boolean> => {
  if (addresses.length === 0) return false;
  const chain = gapSupportedNetworks[0];
  const rpcUrl = getRPCUrlByChainId(chain.id);

  if (!rpcUrl) {
    throw new Error(`RPC URL not configured for chain ${chain.id}`);
  }

  const { JsonRpcProvider } = await import("ethers");
  const provider = new JsonRpcProvider(rpcUrl, {
    chainId: chain.id,
    name: chain.name,
  });

  const owner = await getContractOwner(provider, chain);
  const ownerAddress = owner?.toLowerCase();
  return !!ownerAddress && addresses.some((address) => address.toLowerCase() === ownerAddress);
};

export const useContractOwner = (chainOverride?: Chain) => {
  const { authenticated: isAuth, address, user } = useAuth();
  const setIsOwner = useOwnerStore((state) => state.setIsOwner);
  const setIsOwnerLoading = useOwnerStore((state) => state.setIsOwnerLoading);
  const signer = useSigner();
  const chain = chainOverride || gapSupportedNetworks[0];

  // The active wallet plus every wallet linked to the Privy user, deduped.
  const candidateAddresses = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const candidate of [address, ...(user ? getLinkedWalletAddresses(user) : [])]) {
      if (!candidate) continue;
      const key = candidate.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(candidate);
    }
    return result;
  }, [address, user]);

  // Order-independent signature of the candidate set for the query key.
  const walletsKey = useMemo(
    () =>
      candidateAddresses.length
        ? candidateAddresses
            .map((candidate) => candidate.toLowerCase())
            .sort()
            .join(",")
        : undefined,
    [candidateAddresses]
  );

  const queryResult = useQuery<boolean, Error>({
    queryKey: QUERY_KEYS.AUTH.CONTRACT_OWNER(walletsKey, chain?.id),
    queryFn: () =>
      fetchIsContractOwner(candidateAddresses).catch(() => {
        return false;
      }),
    enabled: candidateAddresses.length > 0 && isAuth,
    staleTime: CONTRACT_OWNER_CACHE_CONFIG.staleTime,
    gcTime: CONTRACT_OWNER_CACHE_CONFIG.gcTime,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, _error) => {
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
  });

  const { data, isLoading, error, refetch } = queryResult;

  // Sync with Zustand store — only when auth is ready and the query is active.
  // When auth isn't ready, the query is disabled and RQ v5 reports isLoading=false,
  // which would overwrite the safe default of isOwnerLoading=true in the store.
  useEffect(() => {
    if (isAuth) {
      setIsOwnerLoading(isLoading);
    }
  }, [isLoading, isAuth, setIsOwnerLoading]);

  useEffect(() => {
    if (!isAuth) {
      setIsOwner(false);
      setIsOwnerLoading(false);
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
