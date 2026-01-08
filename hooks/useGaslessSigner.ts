"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { JsonRpcProvider, type Signer } from "ethers";
import { useCallback, useMemo } from "react";
import {
  arbitrum,
  baseSepolia,
  celo,
  lisk,
  optimism,
  optimismSepolia,
  scroll,
  sei,
  sepolia,
} from "viem/chains";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { envVars } from "@/utilities/enviromentVars";
import { PrivySmartWalletSigner } from "@/utilities/privy-smart-wallet-signer";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";

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
   * Uses Privy smart wallet (gasless) if available, otherwise falls back to regular wallet.
   */
  getAttestationSigner: (chainId: number) => Promise<Signer>;

  /** Whether the smart wallet is ready for gasless transactions. */
  isSmartWalletReady: boolean;

  /** The smart wallet address if available. */
  smartWalletAddress: string | null;
}

/**
 * Hook that provides signers for attestations with gasless support.
 *
 * Uses Privy's smart wallet for gasless transactions when available.
 * Falls back to regular wagmi wallet if smart wallet is not ready.
 */
export function useGaslessSigner(): UseGaslessSignerResult {
  const { client: smartWalletClient } = useSmartWallets();
  const { user, ready: privyReady } = usePrivy();

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
      // Try gasless smart wallet first
      if (isSmartWalletReady && smartWalletClient && smartWalletAddress) {
        const rpcUrl = getRpcUrl(chainId);

        if (rpcUrl) {
          try {
            await smartWalletClient.switchChain({ id: chainId });
            const provider = new JsonRpcProvider(rpcUrl);
            return new PrivySmartWalletSigner(smartWalletClient, smartWalletAddress, provider);
          } catch {
            // Fall through to regular wallet
          }
        }
      }

      // Fallback to regular wagmi wallet
      const { walletClient, error } = await safeGetWalletClient(chainId);

      if (error || !walletClient) {
        throw new Error(`Failed to get wallet client: ${error || "Unknown error"}`);
      }

      const signer = await walletClientToSigner(walletClient);

      if (!signer) {
        throw new Error("Failed to create signer from wallet client");
      }

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
