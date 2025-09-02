"use client";

import { useState, useCallback } from "react";
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

interface UseContractVerificationReturn {
  verifyContract: (
    projectId: string,
    contractAddress: string,
    chainId: number,
    network: string
  ) => Promise<{ success: boolean; error?: string }>;
  getVerificationStatus: (projectId: string) => Promise<VerificationStatus>;
  isVerifying: boolean;
  error: string | null;
}

export const useContractVerification = (): UseContractVerificationReturn => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signMessageAsync } = useSignMessage();

  const verifyContract = useCallback(
    async (
      projectId: string,
      contractAddress: string,
      chainId: number,
      network: string
    ): Promise<{ success: boolean; error?: string }> => {
      setIsVerifying(true);
      setError(null);

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
            message, // Send the message along with signature
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
        setError(errorMessage);
        
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
      } finally {
        setIsVerifying(false);
      }
    },
    [signMessageAsync]
  );

  const getVerificationStatus = useCallback(
    async (projectId: string): Promise<VerificationStatus> => {
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
    },
    []
  );

  return {
    verifyContract,
    getVerificationStatus,
    isVerifying,
    error,
  };
};