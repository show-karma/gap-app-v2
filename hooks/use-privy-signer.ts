"use client";

import { useMemo } from "react";
import { JsonRpcProvider } from "ethers";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { usePrivy } from "@privy-io/react-auth";
import { PrivySmartWalletSigner } from "@/utilities/privy-smart-wallet-signer";
import { envVars } from "@/utilities/enviromentVars";
import {
  optimism,
  arbitrum,
  celo,
  sei,
  lisk,
  scroll,
  optimismSepolia,
  baseSepolia,
  sepolia,
} from "viem/chains";

/**
 * Maps chain IDs to their corresponding RPC URLs from environment variables.
 */
function getRpcUrl(chainId: number): string | null {
  switch (chainId) {
    case optimism.id:
      return envVars.RPC.OPTIMISM || null;
    case arbitrum.id:
      return envVars.RPC.ARBITRUM || null;
    case celo.id:
      return envVars.RPC.CELO || null;
    case sei.id:
      return envVars.RPC.SEI || null;
    case lisk.id:
      return envVars.RPC.LISK || null;
    case scroll.id:
      return envVars.RPC.SCROLL || null;
    case optimismSepolia.id:
      return envVars.RPC.OPT_SEPOLIA || null;
    case baseSepolia.id:
      return envVars.RPC.BASE_SEPOLIA || null;
    case sepolia.id:
      return envVars.RPC.SEPOLIA || null;
    default:
      return null;
  }
}

interface UsePrivySignerOptions {
  chainId: number;
}

interface UsePrivySignerResult {
  signer: PrivySmartWalletSigner | null;
  address: string | null;
  isReady: boolean;
  error: string | null;
}

/**
 * Hook to create a PrivySmartWalletSigner for use with karma-gap-sdk.
 *
 * This hook bridges Privy's smart wallet infrastructure with the ethers-based
 * karma-gap-sdk, enabling gasless attestations.
 *
 * @example
 * const { signer, address, isReady, error } = usePrivySigner({ chainId: 10 });
 *
 * if (isReady && signer) {
 *   await community.attest(signer, data);
 * }
 */
export function usePrivySigner({
  chainId,
}: UsePrivySignerOptions): UsePrivySignerResult {
  const { client } = useSmartWallets();
  const { user, ready: privyReady } = usePrivy();

  return useMemo(() => {
    // Check if Privy is ready
    if (!privyReady) {
      return { signer: null, address: null, isReady: false, error: null };
    }

    // Check if user is authenticated
    if (!user) {
      return {
        signer: null,
        address: null,
        isReady: false,
        error: "User not authenticated",
      };
    }

    // Find the smart wallet account
    const smartWallet = user.linkedAccounts?.find(
      (account) => account.type === "smart_wallet"
    );

    if (!smartWallet || !("address" in smartWallet)) {
      return {
        signer: null,
        address: null,
        isReady: false,
        error:
          "No smart wallet found. User may need to complete first transaction.",
      };
    }

    // Check if smart wallet client is available
    if (!client) {
      return {
        signer: null,
        address: null,
        isReady: false,
        error: "Smart wallet client not ready",
      };
    }

    // Get RPC URL for the chain
    const rpcUrl = getRpcUrl(chainId);
    if (!rpcUrl) {
      return {
        signer: null,
        address: null,
        isReady: false,
        error: `No RPC URL configured for chain ${chainId}`,
      };
    }

    // Create provider and signer
    const provider = new JsonRpcProvider(rpcUrl);
    // The client from useSmartWallets() is a viem WalletClient with request method
    const signer = new PrivySmartWalletSigner(
      client,
      smartWallet.address,
      provider
    );

    return {
      signer,
      address: smartWallet.address,
      isReady: true,
      error: null,
    };
  }, [client, user, privyReady, chainId]);
}
