"use client";

import Safe from "@safe-global/protocol-kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { encodeFunctionData, getAddress, isAddress } from "viem";
import { useAccount, useChainId, useSwitchChain, useWalletClient } from "wagmi";
import { NETWORKS, type SupportedChainId } from "@/config/tokens";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";
import {
  canProposeToSafe,
  createEthereumProvider,
  getSafeNetworkId,
  getSafeServiceUrl,
  isSafeDeployed,
} from "@/utilities/safe";
import { sanitizeErrorMessage } from "../lib/error-messages";
import { CLAIM_CAMPAIGNS_ABI, uuidToBytes16 } from "../lib/hedgey-contract";
import { getChainByName } from "../lib/viem-clients";
import type { ClaimEligibility } from "../types";

interface PendingClaimViaASafe {
  campaignId: string;
  eligibility: ClaimEligibility;
  contractAddress: `0x${string}`;
  claimerAddress: `0x${string}`;
  claimAmount: bigint;
}

export interface UseClaimViaASafeReturn {
  requestClaim: (
    campaignId: string,
    eligibility: ClaimEligibility,
    contractAddress: `0x${string}`,
    claimerAddress: `0x${string}`
  ) => void;
  submitClaim: () => void;
  step: "idle" | "preparing" | "awaiting_signature" | "submitting";
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  safeUrl: string | undefined;
  reset: () => void;
  pendingClaim: PendingClaimViaASafe | null;
  activeCampaignId: string | null;
}

const truncateAddress = (address: string) => formatAddressForDisplay(address, 6, 4);

interface PrepareClaimVariables {
  campaignId: string;
  eligibility: ClaimEligibility;
  contractAddress: `0x${string}`;
  claimerAddress: `0x${string}`;
}

export function useClaimViaASafe(
  tenantId: string,
  networkName: string = "optimism"
): UseClaimViaASafeReturn {
  const { address: userAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const connectedChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();

  const [pendingClaim, setPendingClaim] = useState<PendingClaimViaASafe | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [safeUrl, setSafeUrl] = useState<string | undefined>(undefined);

  const chain = getChainByName(networkName);
  const preparedChainId = chain.id as SupportedChainId;

  const prepareMutation = useMutation({
    mutationFn: async ({
      campaignId,
      eligibility,
      contractAddress,
      claimerAddress,
    }: PrepareClaimVariables): Promise<PendingClaimViaASafe> => {
      if (!userAddress) throw new Error("No user address");
      if (!walletClient) throw new Error("Wallet not connected");

      // Validate Safe is deployed
      const isDeployed = await isSafeDeployed(claimerAddress, preparedChainId);
      if (!isDeployed) {
        throw new Error("Safe wallet is not deployed on this network");
      }

      // Verify user can propose to this Safe
      const { canPropose } = await canProposeToSafe(claimerAddress, userAddress, preparedChainId);
      if (!canPropose) {
        throw new Error("You are not an owner or delegate of this Safe");
      }

      const claimAmount = BigInt(eligibility.amount);

      toast.loading("Preparing Safe transaction...", { id: "safe-claim-prepare" });

      return {
        campaignId,
        eligibility,
        contractAddress,
        claimerAddress,
        claimAmount,
      };
    },
    onSuccess: (data) => {
      setPendingClaim(data);
      toast.success("Safe transaction ready. Please sign to propose.", {
        id: "safe-claim-prepare",
      });
    },
    onError: (err) => {
      const errorMsg = err instanceof Error ? err.message : "Failed to prepare claim";
      toast.error(errorMsg, { id: "safe-claim-prepare" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (): Promise<{
      safeUrl: string;
      claimerAddress: `0x${string}`;
    }> => {
      if (!pendingClaim) throw new Error("No pending claim to submit");
      if (!userAddress) throw new Error("No user address");
      if (!walletClient) throw new Error("Wallet not connected");

      setIsConfirming(true);
      toast.loading("Proposing claim to Safe...", { id: "safe-claim-submit" });

      try {
        // Ensure the wallet is on the campaign's chain — wallets reject typed-data
        // signatures whose domain chainId differs from the active chain.
        if (connectedChainId !== preparedChainId) {
          toast.loading(`Switching wallet to ${chain.name}...`, { id: "safe-claim-submit" });
          await switchChainAsync({ chainId: preparedChainId });
          toast.loading("Proposing claim to Safe...", { id: "safe-claim-submit" });
        }

        const campaignIdBytes = uuidToBytes16(pendingClaim.campaignId);

        // The Safe will execute the claim itself (msg.sender = Safe). Since the Safe
        // address is what's in the merkle tree as the eligible claimer, calling the
        // standard `claim()` lets the contract verify the proof against msg.sender
        // directly — no off-chain ECDSA signature needed (which a contract wallet
        // can't produce anyway).
        const claimData = encodeFunctionData({
          abi: CLAIM_CAMPAIGNS_ABI,
          functionName: "claim",
          args: [campaignIdBytes, pendingClaim.eligibility.proof, pendingClaim.claimAmount],
        });

        const claimFee = BigInt(pendingClaim.eligibility.claimFee);

        // Resolve Safe Transaction Service URL using the canonical Safe network ID
        // (e.g. "optimism" for chain 10) — NOT NETWORKS.shortName which is EIP-3770 ("oeth").
        const txServiceUrl = getSafeServiceUrl(preparedChainId);
        const safeNetworkId = getSafeNetworkId(preparedChainId);
        if (!txServiceUrl || !safeNetworkId) {
          throw new Error(
            `Safe Transaction Service is not available for ${chain.name}. ` +
              `Please use a chain with Safe Transaction Service support.`
          );
        }

        // Reuse the shared provider that handles eth_sign / personal_sign properly —
        // safe.signHash() uses these under the hood.
        const provider = createEthereumProvider(walletClient, preparedChainId);

        const safe = await Safe.init({
          provider,
          signer: userAddress,
          safeAddress: pendingClaim.claimerAddress,
        });

        // Create the Safe transaction for the claim. Safe Transaction Service rejects
        // non-checksummed addresses with HTTP 422, so always pass them through getAddress.
        const checksummedContractAddress = getAddress(pendingClaim.contractAddress);
        const safeTx = await safe.createTransaction({
          transactions: [
            {
              to: checksummedContractAddress,
              value: claimFee.toString(),
              data: claimData,
            },
          ],
        });

        // Get the transaction hash
        const txHash = await safe.getTransactionHash(safeTx);

        // Sign the transaction hash with the user's wallet
        const signature = await safe.signHash(txHash);

        // Propose the transaction via API
        const proposalUrl = `${txServiceUrl}/api/v1/safes/${pendingClaim.claimerAddress}/multisig-transactions/`;

        const proposalBody = {
          to: getAddress(safeTx.data.to),
          value: safeTx.data.value,
          data: safeTx.data.data,
          operation: safeTx.data.operation,
          safeTxGas: String(safeTx.data.safeTxGas),
          baseGas: String(safeTx.data.baseGas),
          gasPrice: String(safeTx.data.gasPrice),
          gasToken: getAddress(safeTx.data.gasToken),
          refundReceiver: getAddress(safeTx.data.refundReceiver),
          nonce: safeTx.data.nonce,
          contractTransactionHash: txHash,
          sender: getAddress(userAddress),
          signature: signature.data,
          origin: "GAP Claim Funds",
        };

        const response = await fetch(proposalUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(proposalBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to propose transaction: ${response.status} ${errorText}`);
        }

        const networkShortName = NETWORKS[preparedChainId].shortName;
        return {
          safeUrl: `https://app.safe.global/transactions/queue?safe=${networkShortName}:${pendingClaim.claimerAddress}`,
          claimerAddress: pendingClaim.claimerAddress,
        };
      } finally {
        setIsConfirming(false);
      }
    },
    onSuccess: ({ safeUrl, claimerAddress }) => {
      setPendingClaim(null);
      setSafeUrl(safeUrl);
      toast.success(
        `Claim proposed to Safe ${truncateAddress(claimerAddress)}. Awaiting execution.`,
        { id: "safe-claim-submit" }
      );
      queryClient.invalidateQueries({
        queryKey: ["claim-eligibility"],
      });
      queryClient.invalidateQueries({
        queryKey: ["claimed-statuses"],
      });
    },
    onError: (err) => {
      const { message } = sanitizeErrorMessage(err, "Claim Failed");
      toast.error(message, { id: "safe-claim-submit" });
    },
  });

  const step: UseClaimViaASafeReturn["step"] = prepareMutation.isPending
    ? "preparing"
    : submitMutation.isPending
      ? "submitting"
      : pendingClaim
        ? "awaiting_signature"
        : "idle";

  const requestClaim = useCallback(
    (
      campaignId: string,
      eligibility: ClaimEligibility,
      contractAddress: `0x${string}`,
      claimerAddress: `0x${string}`
    ) => {
      if (prepareMutation.isPending || submitMutation.isPending) return;
      if (!isAddress(contractAddress)) return;
      prepareMutation.mutate({ campaignId, eligibility, contractAddress, claimerAddress });
    },
    [prepareMutation, submitMutation]
  );

  const submitClaim = useCallback(() => {
    if (!pendingClaim || submitMutation.isPending) return;
    submitMutation.mutate();
  }, [pendingClaim, submitMutation]);

  const activeCampaignId = prepareMutation.isPending
    ? (prepareMutation.variables?.campaignId ?? null)
    : (pendingClaim?.campaignId ?? null);

  const reset = useCallback(() => {
    prepareMutation.reset();
    submitMutation.reset();
    setIsConfirming(false);
    setSafeUrl(undefined);
    setPendingClaim(null);
  }, [prepareMutation, submitMutation]);

  return {
    requestClaim,
    submitClaim,
    step,
    isPending: prepareMutation.isPending || (submitMutation.isPending && !isConfirming),
    isConfirming,
    isSuccess: submitMutation.isSuccess,
    error: prepareMutation.error ?? submitMutation.error ?? null,
    safeUrl,
    reset,
    pendingClaim,
    activeCampaignId,
  };
}
