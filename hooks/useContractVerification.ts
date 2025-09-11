"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSignMessage } from "wagmi";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { errorManager } from "@/components/Utilities/errorManager";

interface VerificationStatus {
  [address: string]: {
    verified: boolean;
    verifiedAt?: string;
    deployerAddress?: string;
  };
}

interface ContractDeployerResponse {
  owner: string;
  error?: string;
}

interface VerifyContractParams {
  projectId: string;
  contractAddress: string;
  chainId: number;
  network: string;
}

interface VerifyContractResponse {
  success: boolean;
  error?: string;
}

/**
 * Hook to get contract deployer/owner
 */
export const useContractDeployer = (
  contractAddress: string | undefined,
  chainId: number | undefined
) => {
  return useQuery({
    queryKey: ["contract", "deployer", contractAddress, chainId],
    queryFn: async (): Promise<ContractDeployerResponse> => {
      if (!contractAddress || !chainId) {
        return { owner: "", error: "Missing parameters" };
      }

      const [data, error] = await fetchData(
        INDEXER.CONTRACT_VERIFICATION.DEPLOYER(contractAddress, chainId),
        "GET"
      );

      if (error || !data) {
        return { 
          owner: "", 
          error: error?.message || "Failed to fetch contract deployer" 
        };
      }

      return data;
    },
    enabled: !!contractAddress && !!chainId,
    staleTime: 60000, // 1 minute
    retry: 2,
  });
};

/**
 * Hook to get verification status for a project's contracts
 */
export const useContractVerificationStatus = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ["contract", "verification-status", projectId],
    queryFn: async (): Promise<VerificationStatus> => {
      if (!projectId) {
        return {};
      }

      const [data, error] = await fetchData(
        INDEXER.CONTRACT_VERIFICATION.STATUS(projectId),
        "GET"
      );

      if (error || !data) {
        console.error("Failed to fetch verification status:", error);
        return {};
      }

      // Transform the response into a lookup object
      const statusMap: VerificationStatus = {};
      if (data.contracts && Array.isArray(data.contracts)) {
        data.contracts.forEach((contract: any) => {
          // Extract just the address part if it includes network prefix
          const addressParts = contract.address.split(":");
          const address = addressParts.length > 1 ? addressParts[1] : contract.address;
          
          statusMap[address.toLowerCase()] = {
            verified: contract.verified || false,
            verifiedAt: contract.verifiedAt,
            deployerAddress: contract.deployerAddress,
          };
        });
      }

      return statusMap;
    },
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to verify contract ownership
 */
export const useVerifyContract = () => {
  const queryClient = useQueryClient();
  const { signMessageAsync } = useSignMessage();

  return useMutation({
    mutationFn: async ({
      projectId,
      contractAddress,
      chainId,
      network,
    }: VerifyContractParams): Promise<VerifyContractResponse> => {
      try {
        // Create verification message
        const timestamp = Date.now();
        const message = `Verify contract ownership for Karma GAP:\n\nContract: ${contractAddress}\nNetwork: ${network}\nChain ID: ${chainId}\nProject: ${projectId}\nTimestamp: ${timestamp}`;

        // Request signature from user
        const signature = await signMessageAsync({ message });

        if (!signature) {
          throw new Error("Signature request was cancelled");
        }

        // Call backend API to verify with the message
        const [data, apiError] = await fetchData(
          INDEXER.CONTRACT_VERIFICATION.VERIFY(projectId),
          "POST",
          {
            contractAddress,
            chainId,
            signature,
            message,
          }
        );

        if (apiError || !data) {
          const errorMessage = apiError?.message || "Verification failed";
          throw new Error(errorMessage);
        }

        if (data.verified) {
          return { success: true };
        } else {
          return { success: false, error: data.error || "Verification failed" };
        }
      } catch (err: any) {
        const errorMessage = err.message || "An unexpected error occurred";
        
        // Log error for debugging
        errorManager(
          "Contract verification failed",
          err,
          {
            projectId,
            contractAddress,
            chainId,
            network,
          },
          { error: errorMessage }
        );

        return { success: false, error: errorMessage };
      }
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate verification status query to refetch latest data
        queryClient.invalidateQueries({
          queryKey: ["contract", "verification-status", variables.projectId],
        });
      }
    },
  });
};

/**
 * Main hook for contract verification functionality
 */
export const useContractVerification = () => {
  const verifyContractMutation = useVerifyContract();

  const verifyContract = async (
    projectId: string,
    contractAddress: string,
    chainId: number,
    network: string
  ): Promise<VerifyContractResponse> => {
    return verifyContractMutation.mutateAsync({
      projectId,
      contractAddress,
      chainId,
      network,
    });
  };

  const getVerificationStatus = async (projectId: string): Promise<VerificationStatus> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.CONTRACT_VERIFICATION.STATUS(projectId),
        "GET"
      );

      if (error || !data) {
        console.error("Failed to fetch verification status:", error);
        return {};
      }

      // Transform the response into a lookup object
      const statusMap: VerificationStatus = {};
      if (data.contracts && Array.isArray(data.contracts)) {
        data.contracts.forEach((contract: any) => {
          // Extract just the address part if it includes network prefix
          const addressParts = contract.address.split(":");
          const address = addressParts.length > 1 ? addressParts[1] : contract.address;
          
          statusMap[address.toLowerCase()] = {
            verified: contract.verified || false,
            verifiedAt: contract.verifiedAt,
            deployerAddress: contract.deployerAddress,
          };
        });
      }

      return statusMap;
    } catch (err) {
      console.error("Error fetching verification status:", err);
      return {};
    }
  };

  return {
    verifyContract,
    getVerificationStatus,
    isVerifying: verifyContractMutation.isPending,
    error: verifyContractMutation.error?.message || null,
  };
};