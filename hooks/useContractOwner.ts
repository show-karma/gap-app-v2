import { useQuery } from "@tanstack/react-query";
import { useOwnerStore } from "@/store/owner";

import { useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { getContractOwner } from "@/utilities/sdk/getContractOwner";
import { Chain } from "viem";
import { useWallet } from "./useWallet";

const fetchContractOwner = async (
  signer: any,
  chain: Chain,
  address: string
): Promise<boolean> => {
  if (!signer || !chain || !address) return false;

  const owner = await getContractOwner(signer, chain);
  return owner?.toLowerCase() === address?.toLowerCase();
};

export const useContractOwner = (address?: string, chain?: Chain) => {
  const { isLoggedIn, getSigner } = useWallet();
  const { setIsOwner, setIsOwnerLoading } = useOwnerStore();

  const queryResult = useQuery<boolean, Error>({
    queryKey: ["contract-owner", address, chain?.id],
    queryFn: async () => {
      const signer = await getSigner();
      return fetchContractOwner(signer, chain!, address!);
    },
    enabled: !!address && !!chain && isLoggedIn,
    staleTime: 10 * 60 * 1000, // 10 minutes - contract owner changes rarely
    retry: (failureCount, error) => {
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
    if (typeof data === "boolean") {
      setIsOwner(data);
    } else if (!address || !isLoggedIn) {
      setIsOwner(false);
    }
  }, [data, address, isLoggedIn, setIsOwner]);

  useEffect(() => {
    if (error) {
      errorManager(`Error fetching contract owner for ${address}`, error, {
        address,
        chain,
      });
      setIsOwner(false);
    }
  }, [error, address, chain, setIsOwner]);

  return {
    ...queryResult,
    refetch,
  };
};
