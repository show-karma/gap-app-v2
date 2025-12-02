import type { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { useCallback, useEffect, useState } from "react";
import type { NetworkAddressPair } from "@/components/Pages/Project/types";

interface VerifiedContract {
  network: string;
  address: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

interface ProjectExternalData extends Record<string, any> {
  network_addresses?: string[];
  network_addresses_verified?: VerifiedContract[];
}

interface UseContractAddressPairsProps {
  project: IProjectResponse & { external: ProjectExternalData };
}

export const useContractAddressPairs = ({ project }: UseContractAddressPairsProps) => {
  const [networkAddressPairs, setNetworkAddressPairs] = useState<NetworkAddressPair[]>([]);

  // Initialize pairs from project data
  useEffect(() => {
    const networkAddresses = project?.external?.network_addresses || [];
    const networkAddressesVerified = project?.external?.network_addresses_verified || [];

    if (networkAddresses.length > 0 || networkAddressesVerified.length > 0) {
      // Create a map of verified contracts for quick lookup
      const verifiedMap = new Map<
        string,
        { verified: boolean; verifiedAt?: string; verifiedBy?: string }
      >();

      networkAddressesVerified.forEach((verifiedEntry) => {
        const key = `${verifiedEntry.network}:${verifiedEntry.address}`.toLowerCase();
        verifiedMap.set(key, {
          verified: verifiedEntry.verified || false,
          verifiedAt: verifiedEntry.verifiedAt,
          verifiedBy: verifiedEntry.verifiedBy,
        });
      });

      // Create a set to track which contracts we've already processed
      const processedKeys = new Set<string>();

      // Process network_addresses and merge with verification data
      const pairs = networkAddresses.map((entry: string) => {
        const [network, address] = entry.split(":");
        const key = `${network}:${address}`.toLowerCase();
        processedKeys.add(key);
        const verificationInfo = verifiedMap.get(key);

        return {
          network,
          address,
          verified: verificationInfo?.verified || false,
          verifiedAt: verificationInfo?.verifiedAt,
          verifiedBy: verificationInfo?.verifiedBy,
        };
      });

      // Add verified contracts that are NOT in network_addresses
      // This handles the case where a contract was verified but not yet added to network_addresses
      networkAddressesVerified.forEach((verifiedEntry) => {
        const key = `${verifiedEntry.network}:${verifiedEntry.address}`.toLowerCase();
        if (!processedKeys.has(key)) {
          pairs.push({
            network: verifiedEntry.network,
            address: verifiedEntry.address,
            verified: verifiedEntry.verified || false,
            verifiedAt: verifiedEntry.verifiedAt,
            verifiedBy: verifiedEntry.verifiedBy,
          });
        }
      });

      setNetworkAddressPairs(pairs);
    } else {
      setNetworkAddressPairs([{ network: "", address: "", verified: false }]);
    }
  }, [project?.external?.network_addresses, project?.external?.network_addresses_verified]);

  const addPair = useCallback(() => {
    setNetworkAddressPairs((prev) => [...prev, { network: "", address: "", verified: false }]);
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

  const updateVerified = useCallback(
    (network: string, address: string, verifiedData: { verified: boolean; verifiedAt?: string; verifiedBy?: string }) => {
      setNetworkAddressPairs((prev) => {
        const newPairs = [...prev];
        const index = newPairs.findIndex(
          (pair) =>
            pair.network.toLowerCase() === network.toLowerCase() &&
            pair.address.toLowerCase() === address.toLowerCase()
        );

        if (index !== -1) {
          newPairs[index] = {
            ...newPairs[index],
            verified: verifiedData.verified,
            verifiedAt: verifiedData.verifiedAt,
            verifiedBy: verifiedData.verifiedBy,
          };
        }

        return newPairs;
      });
    },
    []
  );

  return {
    pairs: networkAddressPairs,
    addPair,
    removePair,
    updateAddress,
    updateNetwork,
    updateVerified,
    setPairs: setNetworkAddressPairs,
  };
};
