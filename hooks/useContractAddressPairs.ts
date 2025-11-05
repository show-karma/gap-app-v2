import { useCallback, useEffect, useState } from "react";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { NetworkAddressPair } from "@/components/Pages/Project/types";

interface UseContractAddressPairsProps {
  project: IProjectResponse & { external: Record<string, string[]> };
}

export const useContractAddressPairs = ({ project }: UseContractAddressPairsProps) => {
  const [networkAddressPairs, setNetworkAddressPairs] = useState<
    NetworkAddressPair[]
  >([]);

  // Initialize pairs from project data
  useEffect(() => {
    const networkAddresses = project?.external?.network_addresses || [];
    const networkAddressesVerified = (project?.external as any)?.network_addresses_verified || [];

    if (networkAddresses.length > 0 || networkAddressesVerified.length > 0) {
      // Create a map of verified contracts for quick lookup
      const verifiedMap = new Map<string, { verified: boolean; verifiedAt?: string; verifiedBy?: string }>();

      networkAddressesVerified.forEach((verifiedEntry: any) => {
        const key = `${verifiedEntry.network}:${verifiedEntry.address}`.toLowerCase();
        verifiedMap.set(key, {
          verified: verifiedEntry.verified || false,
          verifiedAt: verifiedEntry.verifiedAt,
          verifiedBy: verifiedEntry.verifiedBy
        });
      });

      // Process network_addresses and merge with verification data
      const pairs = networkAddresses.map((entry: string) => {
        const [network, address] = entry.split(":");
        const key = `${network}:${address}`.toLowerCase();
        const verificationInfo = verifiedMap.get(key);

        return {
          network,
          address,
          verified: verificationInfo?.verified || false,
          verifiedAt: verificationInfo?.verifiedAt,
          verifiedBy: verificationInfo?.verifiedBy
        };
      });

      setNetworkAddressPairs(pairs);
    } else {
      setNetworkAddressPairs([{ network: "", address: "", verified: false }]);
    }
  }, [project?.external?.network_addresses, (project?.external as any)?.network_addresses_verified]);

  const addPair = useCallback(() => {
    setNetworkAddressPairs((prev) => [
      ...prev,
      { network: "", address: "", verified: false },
    ]);
  }, []);

  const removePair = useCallback((index: number) => {
    setNetworkAddressPairs((prev) => {
      const newPairs = prev.filter((_, i) => i !== index);

      if (newPairs.length === 0) {
        return [{ network: "", address: "", verified: false }];
      }

      return newPairs;
    });
  }, []);

  const updateAddress = useCallback((index: number, value: string) => {
    setNetworkAddressPairs((prev) => {
      const newPairs = [...prev];
      newPairs[index] = { ...newPairs[index], address: value };
      return newPairs;
    });
  }, []);

  const updateNetwork = useCallback((index: number, value: string) => {
    setNetworkAddressPairs((prev) => {
      const newPairs = [...prev];
      newPairs[index] = { ...newPairs[index], network: value };
      return newPairs;
    });
  }, []);

  return {
    pairs: networkAddressPairs,
    addPair,
    removePair,
    updateAddress,
    updateNetwork,
    setPairs: setNetworkAddressPairs,
  };
};
