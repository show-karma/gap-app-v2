"use client";

import { useWallets } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
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
  ) => Promise<void>;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  reset: () => void;
  claimingCampaignId: string | null;
}

export function useClaimTransaction(
  communityId: string,
  claimGrants: ClaimGrantsConfig | undefined
): UseClaimTransactionReturn {
  const provider = useClaimProvider(claimGrants);
  const queryClient = useQueryClient();
  const { wallets } = useWallets();

  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [claimingCampaignId, setClaimingCampaignId] = useState<string | null>(null);

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

  const claim = useCallback(
    async (campaignId: string, eligibility: ClaimEligibility, contractAddress: `0x${string}`) => {
      if (isClaimingRef.current) {
        return;
      }

      const wallet = wallets[0];
      const capturedAddress = wallet?.address;

      if (!wallet || !capturedAddress) {
        setError(new Error("No wallet connected"));
        toast.error("Please connect your wallet to claim");
        return;
      }

      isClaimingRef.current = true;
      setClaimingCampaignId(campaignId);
      setIsPending(true);
      setError(null);
      setTxHash(undefined);
      setIsSuccess(false);

      try {
        const ethereumProvider = await wallet.getEthereumProvider();
        await switchOrAddChain(ethereumProvider, chain);

        if (wallets[0]?.address !== capturedAddress) {
          const errorMsg = "Wallet disconnected during operation";
          if (isMountedRef.current) {
            setError(new Error(errorMsg));
            toast.error(errorMsg);
            setIsPending(false);
          }
          isClaimingRef.current = false;
          return;
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

        if (!isMountedRef.current) {
          isClaimingRef.current = false;
          return;
        }

        setTxHash(hash);
        setIsPending(false);
        setIsConfirming(true);

        toast.loading("Waiting for confirmation...", { id: "claim-tx" });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 300_000,
        });

        if (!isMountedRef.current) {
          isClaimingRef.current = false;
          return;
        }

        if (receipt.status === "success") {
          setIsSuccess(true);
          toast.success("Your tokens have been claimed!", { id: "claim-tx" });
          queryClient.invalidateQueries({
            queryKey: ["claim-eligibility", providerId, communityId, wallets[0]?.address ?? ""],
          });
          queryClient.invalidateQueries({
            queryKey: ["claimed-statuses"],
          });
        } else {
          const errorMsg = "Transaction was reverted on-chain";
          setError(new Error(errorMsg));
          toast.error(errorMsg, { id: "claim-tx" });
        }
      } catch (err) {
        if (!isMountedRef.current) {
          isClaimingRef.current = false;
          return;
        }

        const { message } = sanitizeErrorMessage(err, "Claim Failed");
        setError(err instanceof Error ? err : new Error(message));
        toast.error(message, { id: "claim-tx" });
      } finally {
        if (isMountedRef.current) {
          setIsPending(false);
          setIsConfirming(false);
          setClaimingCampaignId(null);
        }
        isClaimingRef.current = false;
      }
    },
    [wallets, queryClient, providerId, communityId, chain, publicClient]
  );

  const reset = useCallback(() => {
    setIsPending(false);
    setIsConfirming(false);
    setIsSuccess(false);
    setError(null);
    setTxHash(undefined);
    setClaimingCampaignId(null);
  }, []);

  return {
    claim,
    isPending,
    isConfirming,
    isSuccess,
    error,
    txHash,
    reset,
    claimingCampaignId,
  };
}
