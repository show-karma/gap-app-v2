"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { createWalletClient, custom, getAddress, hexToSignature } from "viem";
import type { ClaimGrantsConfig } from "@/src/infrastructure/types/tenant";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";
import { sanitizeErrorMessage } from "../lib/error-messages";
import { buildClaimTypedData, CLAIM_CAMPAIGNS_ABI, uuidToBytes16 } from "../lib/hedgey-contract";
import {
  getBrowserProvider,
  getChainByName,
  getPublicClient,
  requestAccounts,
  switchOrAddChain,
} from "../lib/viem-clients";
import type { ClaimEligibility } from "../types";
import { useClaimProvider } from "./use-claim-provider";

export interface UseDelegatedClaimReturn {
  requestSignature: (
    campaignId: string,
    eligibility: ClaimEligibility,
    contractAddress: `0x${string}`,
    claimerAddress: `0x${string}`
  ) => Promise<void>;
  submitClaim: () => Promise<void>;
  step: "idle" | "awaiting_signature" | "signature_obtained" | "submitting";
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  reset: () => void;
  pendingClaim: {
    campaignId: string;
    eligibility: ClaimEligibility;
    contractAddress: `0x${string}`;
    claimerAddress: `0x${string}`;
    signature: {
      nonce: bigint;
      expiry: bigint;
      v: number;
      r: `0x${string}`;
      s: `0x${string}`;
    };
  } | null;
  activeCampaignId: string | null;
}

const SIGNATURE_EXPIRY_SECONDS = 3600;

const truncateAddress = (address: string) => formatAddressForDisplay(address, 6, 4);

export function useDelegatedClaim(
  communityId: string,
  claimGrants: ClaimGrantsConfig | undefined
): UseDelegatedClaimReturn {
  const provider = useClaimProvider(claimGrants);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<UseDelegatedClaimReturn["step"]>("idle");
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [pendingClaim, setPendingClaim] = useState<UseDelegatedClaimReturn["pendingClaim"]>(null);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const isProcessingRef = useRef(false);
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

  const requestSignature = useCallback(
    async (
      campaignId: string,
      eligibility: ClaimEligibility,
      contractAddress: `0x${string}`,
      claimerAddress: `0x${string}`
    ) => {
      if (isProcessingRef.current) return;

      const ethereum = getBrowserProvider();
      if (!ethereum) {
        setError(new Error("No wallet extension found"));
        toast.error("Please install a wallet extension");
        return;
      }

      isProcessingRef.current = true;
      setActiveCampaignId(campaignId);
      setIsPending(true);
      setError(null);
      setStep("awaiting_signature");

      try {
        const nonce = (await publicClient.readContract({
          address: contractAddress,
          abi: CLAIM_CAMPAIGNS_ABI,
          functionName: "nonces",
          args: [claimerAddress],
        })) as bigint;

        const expiry = BigInt(Math.floor(Date.now() / 1000) + SIGNATURE_EXPIRY_SECONDS);

        const campaignIdBytes = uuidToBytes16(campaignId);
        const claimAmount = BigInt(eligibility.amount);

        const typedData = buildClaimTypedData({
          chainId: chain.id,
          contractAddress,
          campaignId: campaignIdBytes,
          claimer: claimerAddress,
          claimAmount,
          nonce,
          expiry,
        });

        await switchOrAddChain(ethereum, chain);

        const walletClient = createWalletClient({
          account: getAddress(claimerAddress),
          chain,
          transport: custom(ethereum),
        });

        toast("Please sign the authorization in your wallet", {
          icon: "\u270F\uFE0F",
        });

        const signature = await walletClient.signTypedData({
          account: claimerAddress,
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: typedData.message,
        });

        const { v, r, s } = hexToSignature(signature);

        if (!isMountedRef.current) {
          isProcessingRef.current = false;
          return;
        }

        setPendingClaim({
          campaignId,
          eligibility,
          contractAddress,
          claimerAddress,
          signature: {
            nonce,
            expiry,
            v: Number(v),
            r,
            s,
          },
        });

        setStep("signature_obtained");
        setIsPending(false);

        toast.success("Signature obtained! You can now submit the claim transaction.");
      } catch (err) {
        if (!isMountedRef.current) {
          isProcessingRef.current = false;
          return;
        }

        const errorMsg = err instanceof Error ? err.message : "Failed to get signature";
        let toastMsg = errorMsg;

        if (errorMsg.includes("already pending")) {
          toastMsg = "A wallet request is already pending. Please check your wallet extension.";
        } else if (
          errorMsg.includes("does not match") ||
          errorMsg.includes("unknown account") ||
          errorMsg.includes("requested account")
        ) {
          const shortClaimer = truncateAddress(claimerAddress);
          toastMsg = `Please select account ${shortClaimer} in your wallet extension, then try again.`;
        } else if (errorMsg.includes("rejected") || errorMsg.includes("denied")) {
          toastMsg = "You rejected the signature request.";
        }

        setError(err instanceof Error ? err : new Error(errorMsg));
        setStep("idle");
        setIsPending(false);
        setActiveCampaignId(null);

        toast.error(toastMsg);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [publicClient, chain]
  );

  const submitClaim = useCallback(async () => {
    if (!pendingClaim) {
      setError(new Error("No pending claim to submit"));
      return;
    }

    if (isProcessingRef.current) return;

    const ethereum = getBrowserProvider();
    if (!ethereum) {
      setError(new Error("No wallet extension found"));
      toast.error("Please install a wallet extension to submit the transaction");
      return;
    }

    isProcessingRef.current = true;
    setIsPending(true);
    setStep("submitting");
    setError(null);

    try {
      const accounts = await requestAccounts(ethereum);
      const currentAccount = accounts[0];
      if (!currentAccount) {
        throw new Error("No account available in wallet");
      }

      await switchOrAddChain(ethereum, chain);

      const walletClient = createWalletClient({
        account: getAddress(currentAccount),
        chain,
        transport: custom(ethereum),
      });

      const campaignIdBytes = uuidToBytes16(pendingClaim.campaignId);

      const hash = await walletClient.writeContract({
        address: pendingClaim.contractAddress,
        abi: CLAIM_CAMPAIGNS_ABI,
        functionName: "claimWithSig",
        args: [
          campaignIdBytes,
          pendingClaim.eligibility.proof,
          pendingClaim.claimerAddress,
          BigInt(pendingClaim.eligibility.amount),
          {
            nonce: pendingClaim.signature.nonce,
            expiry: pendingClaim.signature.expiry,
            v: pendingClaim.signature.v,
            r: pendingClaim.signature.r,
            s: pendingClaim.signature.s,
          },
        ],
        value: BigInt(pendingClaim.eligibility.claimFee),
      });

      if (!isMountedRef.current) {
        isProcessingRef.current = false;
        return;
      }

      setTxHash(hash);
      setIsPending(false);
      setIsConfirming(true);

      toast.loading("Waiting for confirmation...", { id: "delegated-tx" });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 300_000,
      });

      if (!isMountedRef.current) {
        isProcessingRef.current = false;
        return;
      }

      if (receipt.status === "success") {
        setIsSuccess(true);
        setStep("idle");
        setPendingClaim(null);
        setActiveCampaignId(null);

        toast.success(`Tokens sent to ${truncateAddress(pendingClaim.claimerAddress)}`, {
          id: "delegated-tx",
        });

        queryClient.invalidateQueries({
          queryKey: ["claim-eligibility", providerId, communityId, pendingClaim.claimerAddress],
        });
        queryClient.invalidateQueries({
          queryKey: ["claimed-statuses"],
        });
      } else {
        throw new Error("Transaction was reverted on-chain");
      }
    } catch (err) {
      if (!isMountedRef.current) {
        isProcessingRef.current = false;
        return;
      }

      const { message } = sanitizeErrorMessage(err, "Claim Failed");
      setError(err instanceof Error ? err : new Error(message));
      setStep("signature_obtained");

      toast.error(message, { id: "delegated-tx" });
    } finally {
      if (isMountedRef.current) {
        setIsPending(false);
        setIsConfirming(false);
      }
      isProcessingRef.current = false;
    }
  }, [pendingClaim, chain, publicClient, queryClient, providerId, communityId]);

  const reset = useCallback(() => {
    setStep("idle");
    setIsPending(false);
    setIsConfirming(false);
    setIsSuccess(false);
    setError(null);
    setTxHash(undefined);
    setPendingClaim(null);
    setActiveCampaignId(null);
  }, []);

  return {
    requestSignature,
    submitClaim,
    step,
    isPending,
    isConfirming,
    isSuccess,
    error,
    txHash,
    reset,
    pendingClaim,
    activeCampaignId,
  };
}
