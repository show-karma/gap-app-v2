"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { createWalletClient, custom } from "viem";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import type { ClaimGrantsConfig } from "@/src/infrastructure/types/tenant";
import { selectPrimaryWallet } from "@/utilities/auth/select-primary-wallet";
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
  const { wallets, user } = usePrivyBridge();
  // Sign the claim with the wallet linked to the authenticated user, not whatever
  // Privy lists first. A stale external wallet (e.g. a still-connected MetaMask from
  // a previous session) can otherwise be wallets[0], which would check eligibility
  // for — and sign the claim with — the wrong address. Mirrors useAuth().primaryWallet.
  const primaryWallet = useMemo(() => selectPrimaryWallet(user, wallets), [user, wallets]);

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
      const wallet = primaryWallet;
      const capturedAddress = wallet?.address;

      if (!wallet || !capturedAddress) {
        throw new Error("No wallet connected");
      }

      const ethereumProvider = await wallet.getEthereumProvider();
      await switchOrAddChain(ethereumProvider, chain);

      // Re-derive from the live wallet list to catch a wallet switch/disconnect
      // during the awaited provider + chain setup above.
      if (selectPrimaryWallet(user, wallets)?.address !== capturedAddress) {
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
        queryKey: ["claim-eligibility", providerId, tenantId, primaryWallet?.address ?? ""],
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
      if (!primaryWallet?.address) {
        toast.error("Please connect your wallet to claim");
        return;
      }
      isClaimingRef.current = true;
      mutation.mutate({ campaignId, eligibility, contractAddress });
    },
    [mutation, primaryWallet]
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
