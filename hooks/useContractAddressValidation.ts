import { useCallback } from "react";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

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
 * Hook that provides a function to validate contract addresses
 * Returns a callable function that checks if a contract is already in use
 */
export const useContractAddressValidation = () => {
  const validateContract = useCallback(
    async ({
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
    },
    []
  );

  return { validateContract };
};
