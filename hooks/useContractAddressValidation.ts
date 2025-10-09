import { useMutation } from "@tanstack/react-query";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { QUERY_KEYS } from "@/utilities/queryKeys";

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

/**
 * Hook that provides a mutation function to validate contract addresses
 * Uses react-query for proper state management and error handling
 */
export const useContractAddressValidation = () => {
  const mutation = useMutation({
    mutationFn: validateContractAddress,
    mutationKey: QUERY_KEYS.CONTRACTS.VALIDATION.ALL,
  });

  return {
    validateContract: mutation.mutateAsync,
    isValidating: mutation.isPending,
    error: mutation.error,
  };
};
