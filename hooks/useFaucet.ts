"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { faucetService, type FaucetTransaction } from "@/utilities/faucet/faucetService";
import { useAccount } from "wagmi";
import { useState } from "react";
import toast from "react-hot-toast";

/**
 * Check faucet eligibility for a specific chain and address
 */
export const useFaucetEligibility = (
  chainId: number | undefined,
  transaction?: FaucetTransaction
) => {
  const { address } = useAccount();

  return useQuery({
    queryKey: ["faucet", "eligibility", chainId, address, transaction],
    queryFn: async () => {
      if (!chainId || !address || !transaction) {
        return null;
      }
      return faucetService.checkEligibility(chainId, address, transaction);
    },
    enabled: !!chainId && !!address && !!transaction,
    staleTime: 30000, // 30 seconds
    retry: 1
  });
};

/**
 * Get faucet balance for a specific chain
 */
export const useFaucetBalance = (chainId: number | undefined) => {
  return useQuery({
    queryKey: ["faucet", "balance", chainId],
    queryFn: async () => {
      if (!chainId) return null;
      return faucetService.getBalance(chainId);
    },
    enabled: !!chainId,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000 // Refetch every minute
  });
};

/**
 * Get all faucet balances
 */
export const useAllFaucetBalances = () => {
  return useQuery({
    queryKey: ["faucet", "balances"],
    queryFn: async () => {
      return faucetService.getAllBalances();
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 60000 // Refetch every minute
  });
};

/**
 * Get faucet history for an address
 */
export const useFaucetHistory = (address?: string, chainId?: number) => {
  return useQuery({
    queryKey: ["faucet", "history", address, chainId],
    queryFn: async () => {
      if (!address) return { requests: [], pageInfo: null };
      return faucetService.getHistory(address, chainId);
    },
    enabled: !!address,
    staleTime: 30000 // 30 seconds
  });
};

/**
 * Get faucet statistics
 */
export const useFaucetStats = (chainId?: number, days: number = 7) => {
  return useQuery({
    queryKey: ["faucet", "stats", chainId, days],
    queryFn: async () => {
      return faucetService.getStats(chainId, days);
    },
    staleTime: 300000 // 5 minutes
  });
};

/**
 * Handle the complete faucet claim flow
 */
export const useFaucetClaim = () => {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const createRequestMutation = useMutation({
    mutationFn: async ({
      chainId,
      walletAddress,
      transaction
    }: {
      chainId: number;
      walletAddress: string;
      transaction: FaucetTransaction;
    }) => {
      return faucetService.createRequest(chainId, walletAddress, transaction);
    }
  });

  const claimMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return faucetService.claimFaucet(requestId);
    }
  });

  const claimFaucet = async (
    chainId: number,
    transaction: FaucetTransaction
  ) => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    setIsClaimingFaucet(true);
    setClaimError(null);
    setTransactionHash(null);

    try {
      // Step 1: Create request
      const requestResponse = await createRequestMutation.mutateAsync({
        chainId,
        walletAddress: address,
        transaction
      });

      if (!requestResponse.eligible) {
        throw new Error("Not eligible for faucet");
      }

      // Step 2: Wait a moment for UX (optional)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Claim faucet
      const claimResponse = await claimMutation.mutateAsync(
        requestResponse.requestId
      );

      setTransactionHash(claimResponse.transactionHash);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["faucet", "eligibility", chainId]
      });
      queryClient.invalidateQueries({
        queryKey: ["faucet", "history", address]
      });
      queryClient.invalidateQueries({
        queryKey: ["faucet", "balance", chainId]
      });

      toast.success("Funds received successfully!");

      return claimResponse;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to claim faucet";
      setClaimError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  const resetFaucetState = () => {
    setIsClaimingFaucet(false);
    setClaimError(null);
    setTransactionHash(null);
  };

  return {
    claimFaucet,
    isClaimingFaucet,
    claimError,
    transactionHash,
    resetFaucetState,
    isCreatingRequest: createRequestMutation.isPending,
    isClaiming: claimMutation.isPending
  };
};

/**
 * Monitor a faucet request
 */
export const useFaucetRequest = (requestId: string | null) => {
  return useQuery({
    queryKey: ["faucet", "request", requestId],
    queryFn: async () => {
      if (!requestId) return null;
      return faucetService.getRequest(requestId);
    },
    enabled: !!requestId,
    // refetchInterval: (data) => {
    //   // Stop polling if request is completed or failed
    //   if (data?.d === "CLAIMED" || data?.status === "FAILED") {
    //     return false;
    //   }
    //   return 2000; // Poll every 2 seconds
    // }
  });
};