"use client";

import { useCallback, useMemo } from "react";
import { JsonRpcProvider, Signer } from "ethers";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { usePrivy } from "@privy-io/react-auth";
import { PrivySmartWalletSigner } from "@/utilities/privy-smart-wallet-signer";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";
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

interface UseGaslessSignerResult {
  /**
   * Gets a signer for attestations.
   * Attempts to use Privy smart wallet (gasless) first, falls back to regular wallet.
   */
  getAttestationSigner: (chainId: number) => Promise<Signer>;

  /**
   * Whether the smart wallet is ready for gasless transactions.
   */
  isSmartWalletReady: boolean;

  /**
   * The smart wallet address if available.
   */
  smartWalletAddress: string | null;
}

/**
 * Hook that provides a unified way to get signers for attestations.
 *
 * Attempts to use Privy's smart wallet for gasless transactions.
 * Falls back to regular wagmi wallet if smart wallet is not available.
 *
 * @example
 * const { getAttestationSigner, isSmartWalletReady } = useGaslessSigner();
 *
 * const handleAttest = async () => {
 *   const signer = await getAttestationSigner(chainId);
 *   await entity.attest(signer, data);
 * };
 */
export function useGaslessSigner(): UseGaslessSignerResult {
  const { client: smartWalletClient } = useSmartWallets();
  const { user, ready: privyReady } = usePrivy();

  // Find the smart wallet account
  const smartWallet = useMemo(() => {
    if (!privyReady || !user) return null;
    return user.linkedAccounts?.find(
      (account) => account.type === "smart_wallet" && "address" in account
    );
  }, [privyReady, user]);

  const smartWalletAddress = useMemo(() => {
    if (!smartWallet || !("address" in smartWallet)) return null;
    return smartWallet.address;
  }, [smartWallet]);

  const isSmartWalletReady = useMemo(() => {
    return !!(privyReady && smartWalletClient && smartWalletAddress);
  }, [privyReady, smartWalletClient, smartWalletAddress]);

  const getAttestationSigner = useCallback(
    async (chainId: number): Promise<Signer> => {
      console.log("[Gasless] Getting signer for chain:", chainId);
      console.log("[Gasless] Smart wallet ready:", isSmartWalletReady);
      console.log("[Gasless] Smart wallet address:", smartWalletAddress);

      // Try to use smart wallet for gasless transactions
      if (isSmartWalletReady && smartWalletClient && smartWalletAddress) {
        const rpcUrl = getRpcUrl(chainId);
        console.log("[Gasless] RPC URL for chain:", rpcUrl);

        if (rpcUrl) {
          try {
            // Switch smart wallet to the target chain
            console.log("[Gasless] Switching smart wallet to chain:", chainId);
            await smartWalletClient.switchChain({ id: chainId });

            const provider = new JsonRpcProvider(rpcUrl);
            // The smartWalletClient is a viem WalletClient - pass it directly
            // PrivySmartWalletSigner will use its request method for JSON-RPC calls
            const signer = new PrivySmartWalletSigner(
              smartWalletClient,
              smartWalletAddress,
              provider
            );

            console.log("[Gasless] Created gasless signer successfully");
            console.log("[Gasless] NOTE: If paymaster rejects, transaction will fail.");
            console.log("[Gasless] Check Privy Dashboard > Smart Wallets > Gas Policies");
            return signer;
          } catch (error) {
            console.warn(
              "[Gasless] Failed to create gasless signer, falling back to regular wallet:",
              error
            );
            // Fall through to regular wallet
          }
        } else {
          console.log("[Gasless] No RPC URL for chain, falling back to regular wallet");
        }
      } else {
        console.log("[Gasless] Smart wallet not ready, using regular wallet");
      }

      // Fallback to regular wagmi wallet
      console.log("[Gasless] Getting regular wallet client...");
      const { walletClient, error } = await safeGetWalletClient(chainId);

      if (error || !walletClient) {
        console.error("[Gasless] Failed to get wallet client:", error);
        throw new Error(
          `Failed to get wallet client: ${error || "Unknown error"}`
        );
      }

      console.log("[Gasless] Got wallet client, creating signer...");
      const signer = await walletClientToSigner(walletClient);

      if (!signer) {
        console.error("[Gasless] Failed to create signer from wallet client");
        throw new Error("Failed to create signer from wallet client");
      }

      console.log("[Gasless] Created regular signer successfully");
      return signer;
    },
    [isSmartWalletReady, smartWalletClient, smartWalletAddress]
  );

  return {
    getAttestationSigner,
    isSmartWalletReady,
    smartWalletAddress,
  };
}
