import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import type { NetworkAddressPair } from "@/components/Pages/Project/types";
import { errorManager } from "@/components/Utilities/errorManager";
import { validateNetworkAddressPair } from "@/schemas/contractAddress";
import { useProjectStore } from "@/store";
import { getContractKey } from "@/utilities/contractKey";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { useContractAddressValidation } from "./useContractAddressValidation";

interface UseContractAddressSaveProps {
  projectUid: string;
  onSuccess?: () => void;
}

export const useContractAddressSave = ({ projectUid, onSuccess }: UseContractAddressSaveProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();
  const { refreshProject } = useProjectStore();
  const { validateAll, invalidContracts, setInvalidContracts } = useContractAddressValidation({
    projectUid,
  });

  const saveContracts = useCallback(
    async (pairs: NetworkAddressPair[]): Promise<boolean> => {
      const formattedAddresses = pairs.map((pair) => `${pair.network}:${pair.address}`);

      try {
        const [data, error] = await fetchData(INDEXER.PROJECT.EXTERNAL.UPDATE(projectUid), "PUT", {
          target: "network_addresses",
          ids: formattedAddresses,
        });

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
          { error: MESSAGES.PROJECT.LINK_CONTRACT_ADDRESSES.ERROR }
        );
        return false;
      }
    },
    [projectUid, onSuccess, refreshProject, address]
  );

  const save = useCallback(
    async (pairs: NetworkAddressPair[]) => {
      setIsLoading(true);
      setError(null);
      setInvalidContracts(new Map());

      try {
        // Filter out empty pairs
        const validPairs = pairs.filter(
          (pair) => pair?.network?.trim() !== "" && pair?.address?.trim() !== ""
        );

        // First, validate address format with zod
        const formatValidationErrors = new Map<
          string,
          { projectName: string; errorMessage: string }
        >();

        validPairs.forEach((pair) => {
          const validation = validateNetworkAddressPair(pair.network, pair.address);
          if (!validation.isValid && validation.errors) {
            const contractKey = getContractKey(pair.network, pair.address);
            const errorMessage =
              validation.errors.address || validation.errors.network || "Invalid format";
            formatValidationErrors.set(contractKey, {
              projectName: "Validation Failed",
              errorMessage,
            });
          }
        });

        // Stop if any addresses have invalid format
        if (formatValidationErrors.size > 0) {
          setInvalidContracts(formatValidationErrors);
          return;
        }

        // Then validate against backend (check for duplicates)
        const invalidResults = await validateAll(validPairs);

        // Stop if any contracts are already in use
        if (invalidResults.size > 0) {
          return;
        }

        // All valid - proceed with save
        await saveContracts(validPairs);
      } finally {
        setIsLoading(false);
      }
    },
    [validateAll, saveContracts, setInvalidContracts]
  );

  return {
    save,
    isLoading,
    error,
    setError,
    invalidContracts,
  };
};
