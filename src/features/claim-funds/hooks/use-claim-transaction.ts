"use client";

import { useWallets } from "@privy-io/react-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { createWalletClient, custom } from "viem";
import type { ClaimGrantsConfig } from "@/src/infrastructure/types/tenant";
import { sanitizeErrorMessage } from "../lib/error-messages";
import { CLAIM_CAMPAIGNS_ABI, uuidToBytes16 } from "../lib/hedgey-contract";
import { getChainByName, getPublicClient, switchOrAddChain } from "../lib/viem-clients";
import type { ClaimEligibility } from "../types";
import { useClaimProvider } from "./use-claim-provider";

export interface UseClaimTransactionReturn {
  claim: (
    campaignId: string,
    eligibility: ClaimEligibility,
    contractAddress: `0x${string}`
  ) => void;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  reset: () => void;
  claimingCampaignId: string | null;
}

interface ClaimVariables {
  campaignId: string;
  eligibility: ClaimEligibility;
  contractAddress: `0x${string}`;
}

export function useClaimTransaction(
  tenantId: string,
  claimGrants: ClaimGrantsConfig | undefined
): UseClaimTransactionReturn {
  const provider = useClaimProvider(claimGrants);
  const queryClient = useQueryClient();
  const { wallets } = useWallets();

  const [isConfirming, setIsConfirming] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const isClaimingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const providerId = provider?.id ?? "none";

  const networkName =
    claimGrants?.providerConfig?.type === "hedgey"
      ? claimGrants.providerConfig.networkName
      : "optimism";

  const chain = getChainByName(networkName);
  const publicClient = getPublicClient(networkName);

  const mutation = useMutation({
    mutationFn: async ({ campaignId, eligibility, contractAddress }: ClaimVariables) => {
      const wallet = wallets[0];
      const capturedAddress = wallet?.address;

      if (!wallet || !capturedAddress) {
        throw new Error("No wallet connected");
      }

      const ethereumProvider = await wallet.getEthereumProvider();
      await switchOrAddChain(ethereumProvider, chain);

      if (wallets[0]?.address !== capturedAddress) {
        throw new Error("Wallet disconnected during operation");
      }

      const walletClient = createWalletClient({
        account: capturedAddress as `0x${string}`,
        chain,
        transport: custom(ethereumProvider),
      });

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: CLAIM_CAMPAIGNS_ABI,
        functionName: "claim",
        args: [uuidToBytes16(campaignId), eligibility.proof, BigInt(eligibility.amount)],
        value: BigInt(eligibility.claimFee),
      });

      setTxHash(hash);
      setIsConfirming(true);
      toast.loading("Waiting for confirmation...", { id: "claim-tx" });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 300_000,
      });

      if (receipt.status !== "success") {
        throw new Error("Transaction was reverted on-chain");
      }

      return hash;
    },
    onSuccess: () => {
      toast.success("Your tokens have been claimed!", { id: "claim-tx" });
      queryClient.invalidateQueries({
        queryKey: ["claim-eligibility", providerId, tenantId, wallets[0]?.address ?? ""],
      });
      queryClient.invalidateQueries({
        queryKey: ["claimed-statuses"],
      });
    },
    onError: (err) => {
      const { message } = sanitizeErrorMessage(err, "Claim Failed");
      toast.error(message, { id: "claim-tx" });
    },
    onSettled: () => {
      isClaimingRef.current = false;
      setIsConfirming(false);
    },
  });

  const claim = useCallback(
    (campaignId: string, eligibility: ClaimEligibility, contractAddress: `0x${string}`) => {
      if (isClaimingRef.current || mutation.isPending) return;
      if (!wallets[0]?.address) {
        toast.error("Please connect your wallet to claim");
        return;
      }
      isClaimingRef.current = true;
      mutation.mutate({ campaignId, eligibility, contractAddress });
    },
    [mutation, wallets]
  );

  const reset = useCallback(() => {
    mutation.reset();
    setIsConfirming(false);
    setTxHash(undefined);
  }, [mutation]);

  return {
    claim,
    isPending: mutation.isPending && !isConfirming,
    isConfirming,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    txHash,
    reset,
    claimingCampaignId: mutation.isPending ? (mutation.variables?.campaignId ?? null) : null,
  };
}
