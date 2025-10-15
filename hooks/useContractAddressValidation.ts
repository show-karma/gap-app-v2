import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";
import { NetworkAddressPair } from "@/components/Pages/Project/types";
import { InvalidInfo } from "@/components/Pages/Project/ContractAddressItem";
import { getContractKey } from "@/utilities/contractKey";

export interface ContractAddressValidationResult {
  isAvailable: boolean;
  existingProject?: {
    uid: string;
    name: string;
    slug?: string;
  };
}

interface ValidateContractParams {
  address: string;
  network: string;
  excludeProjectId?: string;
}

/**
 * Validates a single contract address against the indexer
 */
const validateContractAddress = async ({
  address,
  network,
  excludeProjectId,
}: ValidateContractParams): Promise<ContractAddressValidationResult> => {
  const params = new URLSearchParams({
    address,
    network,
    ...(excludeProjectId && { excludeProjectId }),
  });

  const [data, error] = await fetchData(
    `${INDEXER.PROJECT.CONTRACTS.CHECK_ADDRESS()}?${params.toString()}`,
    "GET",
    {},
    {},
    {},
    true // authenticated
  );

  if (error) {
    throw new Error(error);
  }

  return data || { isAvailable: true };
};

interface UseContractAddressValidationProps {
  projectUid: string;
}

/**
 * Hook that provides validation functionality for contract addresses
 * Includes both single validation and batch validation with error state management
 */
export const useContractAddressValidation = ({ projectUid }: UseContractAddressValidationProps) => {
  const [invalidContracts, setInvalidContracts] = useState<Map<string, InvalidInfo>>(
    new Map()
  );

  const mutation = useMutation({
    mutationFn: validateContractAddress,
    mutationKey: QUERY_KEYS.CONTRACTS.VALIDATION.ALL,
  });

  const clearError = useCallback(
    (pair: NetworkAddressPair) => {
      if (pair.network && pair.address) {
        const contractKey = getContractKey(pair.network, pair.address);
        setInvalidContracts((prev) => {
          const newMap = new Map(prev);
          newMap.delete(contractKey);
          return newMap;
        });
      }
    },
    []
  );

  const validateAll = useCallback(
    async (
      pairs: NetworkAddressPair[],
    ): Promise<Map<string, InvalidInfo>> => {
      // Create validation promises for all pairs in parallel
      const validationPromises = pairs.map((pair) =>
        mutation.mutateAsync({
          address: pair.address,
          network: pair.network,
          excludeProjectId: projectUid,
        })
          .then((result) => ({ pair, result, error: null }))
          .catch((error) => ({ pair, result: null, error })),
      );

      // Wait for all validations to complete
      const results = await Promise.all(validationPromises);

      // Build validation results map using composite keys
      const validationResults = new Map<string, InvalidInfo>();

      results.forEach(({ pair, result, error }) => {
        if (error) {
          console.error("Error validating contract address:", error);
          const contractKey = getContractKey(pair.network, pair.address);
          const errorMessage = error?.message || String(error);
          validationResults.set(contractKey, {
            projectName: "Validation Failed",
            errorMessage: errorMessage,
          });
          return;
        }

        if (result && !result.isAvailable && result.existingProject) {
          const contractKey = getContractKey(pair.network, pair.address);
          validationResults.set(contractKey, {
            projectName: result.existingProject.name || "Unknown Project",
            projectSlug: result.existingProject.slug,
          });
        }
      });

      setInvalidContracts(validationResults);
      return validationResults;
    },
    [mutation, projectUid],
  );

  return {
    validateContract: mutation.mutateAsync,
    isValidating: mutation.isPending,
    error: mutation.error,
    invalidContracts,
    validateAll,
    clearError,
    setInvalidContracts,
  };
};
