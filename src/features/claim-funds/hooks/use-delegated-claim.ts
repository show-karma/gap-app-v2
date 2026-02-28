"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
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

interface PendingClaim {
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
}

export interface UseDelegatedClaimReturn {
  requestSignature: (
    campaignId: string,
    eligibility: ClaimEligibility,
    contractAddress: `0x${string}`,
    claimerAddress: `0x${string}`
  ) => void;
  submitClaim: () => void;
  step: "idle" | "awaiting_signature" | "signature_obtained" | "submitting";
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
  reset: () => void;
  pendingClaim: PendingClaim | null;
  activeCampaignId: string | null;
}

const SIGNATURE_EXPIRY_SECONDS = 3600;

const truncateAddress = (address: string) => formatAddressForDisplay(address, 6, 4);

interface SignatureVariables {
  campaignId: string;
  eligibility: ClaimEligibility;
  contractAddress: `0x${string}`;
  claimerAddress: `0x${string}`;
}

export function useDelegatedClaim(
  communityId: string,
  claimGrants: ClaimGrantsConfig | undefined
): UseDelegatedClaimReturn {
  const provider = useClaimProvider(claimGrants);
  const queryClient = useQueryClient();

  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const providerId = provider?.id ?? "none";

  const networkName =
    claimGrants?.providerConfig?.type === "hedgey"
      ? claimGrants.providerConfig.networkName
      : "optimism";

  const chain = getChainByName(networkName);
  const publicClient = getPublicClient(networkName);

  const signatureMutation = useMutation({
    mutationFn: async ({
      campaignId,
      eligibility,
      contractAddress,
      claimerAddress,
    }: SignatureVariables): Promise<PendingClaim> => {
      const ethereum = getBrowserProvider();
      if (!ethereum) throw new Error("No wallet extension found");

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

      return {
        campaignId,
        eligibility,
        contractAddress,
        claimerAddress,
        signature: { nonce, expiry, v: Number(v), r, s },
      };
    },
    onSuccess: (data) => {
      setPendingClaim(data);
      toast.success("Signature obtained! You can now submit the claim transaction.");
    },
    onError: (err, variables) => {
      const errorMsg = err instanceof Error ? err.message : "Failed to get signature";
      let toastMsg = errorMsg;

      if (errorMsg.includes("already pending")) {
        toastMsg = "A wallet request is already pending. Please check your wallet extension.";
      } else if (
        errorMsg.includes("does not match") ||
        errorMsg.includes("unknown account") ||
        errorMsg.includes("requested account")
      ) {
        toastMsg = `Please select account ${truncateAddress(variables.claimerAddress)} in your wallet extension, then try again.`;
      } else if (errorMsg.includes("rejected") || errorMsg.includes("denied")) {
        toastMsg = "You rejected the signature request.";
      }

      toast.error(toastMsg);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (): Promise<{
      hash: `0x${string}`;
      claimerAddress: `0x${string}`;
    }> => {
      if (!pendingClaim) throw new Error("No pending claim to submit");

      const ethereum = getBrowserProvider();
      if (!ethereum) throw new Error("No wallet extension found");

      const accounts = await requestAccounts(ethereum);
      const currentAccount = accounts[0];
      if (!currentAccount) throw new Error("No account available in wallet");

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

      setTxHash(hash);
      setIsConfirming(true);
      toast.loading("Waiting for confirmation...", { id: "delegated-tx" });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 300_000,
      });

      if (receipt.status !== "success") {
        throw new Error("Transaction was reverted on-chain");
      }

      return { hash, claimerAddress: pendingClaim.claimerAddress };
    },
    onSuccess: ({ claimerAddress }) => {
      setPendingClaim(null);
      toast.success(`Tokens sent to ${truncateAddress(claimerAddress)}`, {
        id: "delegated-tx",
      });
      queryClient.invalidateQueries({
        queryKey: ["claim-eligibility", providerId, communityId, claimerAddress],
      });
      queryClient.invalidateQueries({
        queryKey: ["claimed-statuses"],
      });
    },
    onError: (err) => {
      const { message } = sanitizeErrorMessage(err, "Claim Failed");
      toast.error(message, { id: "delegated-tx" });
    },
    onSettled: () => {
      setIsConfirming(false);
    },
  });

  // Derive step from mutation states and pendingClaim
  const step: UseDelegatedClaimReturn["step"] = signatureMutation.isPending
    ? "awaiting_signature"
    : submitMutation.isPending
      ? "submitting"
      : pendingClaim
        ? "signature_obtained"
        : "idle";

  const requestSignature = useCallback(
    (
      campaignId: string,
      eligibility: ClaimEligibility,
      contractAddress: `0x${string}`,
      claimerAddress: `0x${string}`
    ) => {
      if (signatureMutation.isPending || submitMutation.isPending) return;
      signatureMutation.mutate({ campaignId, eligibility, contractAddress, claimerAddress });
    },
    [signatureMutation, submitMutation]
  );

  const submitClaim = useCallback(() => {
    if (!pendingClaim || submitMutation.isPending) return;
    submitMutation.mutate();
  }, [pendingClaim, submitMutation]);

  const activeCampaignId = signatureMutation.isPending
    ? (signatureMutation.variables?.campaignId ?? null)
    : (pendingClaim?.campaignId ?? null);

  const reset = useCallback(() => {
    signatureMutation.reset();
    submitMutation.reset();
    setIsConfirming(false);
    setTxHash(undefined);
    setPendingClaim(null);
  }, [signatureMutation, submitMutation]);

  return {
    requestSignature,
    submitClaim,
    step,
    isPending: signatureMutation.isPending || (submitMutation.isPending && !isConfirming),
    isConfirming,
    isSuccess: submitMutation.isSuccess,
    error: signatureMutation.error ?? submitMutation.error ?? null,
    txHash,
    reset,
    pendingClaim,
    activeCampaignId,
  };
}
