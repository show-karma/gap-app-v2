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
    if (project?.external?.network_addresses?.length) {
      const pairs = project.external.network_addresses.map((entry) => {
        const [network, address] = entry.split(":");
        return { network, address };
      });
      setNetworkAddressPairs(pairs);
    } else {
      setNetworkAddressPairs([{ network: "", address: "" }]);
    }
  }, [project?.external?.network_addresses]);

  const addPair = useCallback(() => {
    setNetworkAddressPairs((prev) => [
      ...prev,
      { network: "", address: "" },
    ]);
  }, []);

  const removePair = useCallback((index: number) => {
    setNetworkAddressPairs((prev) => {
      const newPairs = prev.filter((_, i) => i !== index);

      if (newPairs.length === 0) {
        return [{ network: "", address: "" }];
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
