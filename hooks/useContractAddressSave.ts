import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { NetworkAddressPair } from "@/components/Pages/Project/types";
import { errorManager } from "@/components/Utilities/errorManager";
import { useProjectStore } from "@/store";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { useContractAddressValidation } from "./useContractAddressValidation";

interface UseContractAddressSaveProps {
  projectUid: string;
  onSuccess?: () => void;
}

export const useContractAddressSave = ({
  projectUid,
  onSuccess,
}: UseContractAddressSaveProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();
  const { refreshProject } = useProjectStore();
  const { validateAll, invalidContracts, setInvalidContracts } =
    useContractAddressValidation({ projectUid });

  const saveContracts = useCallback(
    async (pairs: NetworkAddressPair[]): Promise<boolean> => {
      const formattedAddresses = pairs.map(
        (pair) => `${pair.network}:${pair.address}`,
      );

      try {
        const [data, error] = await fetchData(
          INDEXER.PROJECT.EXTERNAL.UPDATE(projectUid),
          "PUT",
          {
            target: "network_addresses",
            ids: formattedAddresses,
          },
        );

        if (error) {
          setError(MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR);
          throw new Error(MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR);
        }

        if (data) {
          toast.success(MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.SUCCESS);
          refreshProject();
          if (onSuccess) {
            onSuccess();
          }
          return true;
        }

        return false;
      } catch (err) {
        setError(MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR);
        errorManager(
          MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR,
          err,
          {
            projectUID: projectUid,
            target: "network_addresses",
            ids: formattedAddresses,
            address,
          },
          { error: MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR },
        );
        return false;
      }
    },
    [projectUid, onSuccess, refreshProject, address],
  );

  const save = useCallback(
    async (pairs: NetworkAddressPair[]) => {
      setIsLoading(true);
      setError(null);
      setInvalidContracts(new Map());

      try {
        // Filter out empty pairs
        const validPairs = pairs.filter(
          (pair) =>
            pair?.network?.trim() !== "" && pair?.address?.trim() !== "",
        );

        // Validate all contracts
        const invalidResults = await validateAll(validPairs);

        // Stop if any contracts are invalid
        if (invalidResults.size > 0) {
          return;
        }

        // All valid - proceed with save
        await saveContracts(validPairs);
      } finally {
        setIsLoading(false);
      }
    },
    [validateAll, saveContracts, setInvalidContracts],
  );

  return {
    save,
    isLoading,
    error,
    setError,
    invalidContracts,
  };
};
