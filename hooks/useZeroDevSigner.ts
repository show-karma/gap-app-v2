"use client";

import type { User } from "@privy-io/react-auth";
import type { Signer } from "ethers";
import { BrowserProvider } from "ethers";
import { useCallback, useMemo } from "react";
import { createWalletClient, custom } from "viem";
import type { Chain } from "viem/chains";
import {
  arbitrum,
  base,
  baseSepolia,
  celo,
  lisk,
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  scroll,
  sei,
  sepolia,
} from "viem/chains";
import { useChainId } from "wagmi";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import {
  createGaslessClient,
  createPrivySignerForGasless,
  GaslessProviderError,
  getGaslessSigner,
  isChainSupportedForGasless,
} from "@/utilities/gasless";
import { appNetwork } from "@/utilities/network";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";

/**
 * Fallback chain catalog — every chain the SDK + indexer recognise, even
 * ones that get stripped from `appNetwork` in production builds (testnets
 * are excluded when NEXT_PUBLIC_ENV === "production"). Using this as a
 * secondary lookup lets the external-wallet path complete attestations
 * for on-chain milestones that live on testnets, regardless of the
 * production-build chain whitelist.
 */
const KNOWN_CHAINS: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [optimism.id]: optimism,
  [arbitrum.id]: arbitrum,
  [base.id]: base,
  [celo.id]: celo,
  [polygon.id]: polygon,
  [lisk.id]: lisk,
  [scroll.id]: scroll,
  [sei.id]: sei,
  [optimismSepolia.id]: optimismSepolia,
  [baseSepolia.id]: baseSepolia,
  [sepolia.id]: sepolia,
};

function resolveChain(targetChainId: number): Chain | undefined {
  return appNetwork.find((c) => c.id === targetChainId) ?? KNOWN_CHAINS[targetChainId];
}

/**
 * Reads the chain the signer's provider actually reports. Embedded (email/Google)
 * wallets default to mainnet (chain 1), which the GAP SDK rejects on the very
 * first call (`getMulticall`) with "Network mainnet not supported." — so a signer
 * built before the network switch has propagated must never reach the SDK.
 */
async function getSignerChainId(signer: Signer): Promise<number | undefined> {
  const network = await signer.provider?.getNetwork();
  return network ? Number(network.chainId) : undefined;
}

/**
 * Builds the user-facing error for a chain mismatch. Embedded (email/Google)
 * wallets have no network-switcher UI — the app owns the switch — so a
 * persistent mismatch is a transient app-side race, not something the user can
 * fix manually. The message says "try again", never "switch your network".
 */
function chainMismatchError(expectedChainId: number, actualChainId: number | undefined): Error {
  return new Error(
    `Couldn't switch your wallet to the required network (chain ${expectedChainId}); it is still on chain ${actualChainId ?? "unknown"}. Please try again in a moment.`
  );
}

/**
 * Guards the embedded-wallet attestation signer: if the signer's provider is
 * still not on the expected chain after the app has switched it, fail with an
 * explicit, debuggable error instead of letting the cryptic SDK
 * "Network ... not supported." throw surface.
 */
async function assertSignerOnChain(signer: Signer, expectedChainId: number): Promise<Signer> {
  const actualChainId = await getSignerChainId(signer);
  if (actualChainId !== expectedChainId) {
    throw chainMismatchError(expectedChainId, actualChainId);
  }
  return signer;
}

/**
 * Check if user logged in with email/Google (not wallet).
 * These users should use embedded wallet with gasless transactions.
 */
function didUserLoginWithEmailOrSocial(user: User | null): boolean {
  if (!user) return false;
  // Check linked accounts for email, Google OAuth, or Farcaster
  // Farcaster users get an embedded wallet via createOnLogin: "users-without-wallets"
  return user.linkedAccounts.some(
    (account) =>
      account.type === "email" || account.type === "google_oauth" || account.type === "farcaster"
  );
}

interface UseZeroDevSignerResult {
  /**
   * Gets a signer for attestations.
   * - For embedded wallet users: Uses gasless transactions (SAME address via EIP-7702)
   * - For external wallet users: Regular wallet (user pays gas)
   */
  getAttestationSigner: (chainId: number | string) => Promise<Signer>;

  /** Whether the current user can use gasless transactions (embedded wallet only) */
  isGaslessAvailable: boolean;

  /** The wallet address that will be used for attestations */
  attestationAddress: string | null;

  /** Whether the user has an embedded wallet (email/Google/passkey login) */
  hasEmbeddedWallet: boolean;

  /** Whether the user has an external wallet (MetaMask, etc.) */
  hasExternalWallet: boolean;
}

/**
 * Hook that provides signers for attestations with gasless support.
 *
 * Architecture:
 * - Uses the gasless module which automatically selects the appropriate provider
 *   (ZeroDev, Alchemy, etc.) based on chain configuration.
 * - All EIP-7702 complexity is handled internally by the provider implementations.
 *
 * Behavior:
 * - For embedded wallet users (email/Google/passkey login):
 *   - On gasless-supported chains: Uses appropriate provider (gasless, user doesn't pay)
 *   - On unsupported chains: Uses embedded wallet directly (user pays gas)
 * - For external wallet users (MetaMask, etc.): User always pays gas
 */
export function useZeroDevSigner(): UseZeroDevSignerResult {
  const { ready: privyReady, user, wallets } = usePrivyBridge();
  const chainId = useChainId();

  // Check if user logged in with email/Google (should use embedded wallet)
  const isEmailOrSocialLogin = useMemo(() => {
    return didUserLoginWithEmailOrSocial(user);
  }, [user]);

  // Find embedded wallet (Privy-managed wallet for email/Google/passkey users)
  const embeddedWallet = useMemo(() => {
    if (!privyReady || !wallets.length) return null;
    return wallets.find((wallet) => wallet.walletClientType === "privy") || null;
  }, [privyReady, wallets]);

  // Find external wallet (MetaMask, Coinbase, etc.)
  const externalWallet = useMemo(() => {
    if (!privyReady || !wallets.length) return null;
    return wallets.find((wallet) => wallet.walletClientType !== "privy") || null;
  }, [privyReady, wallets]);

  const hasEmbeddedWallet = !!embeddedWallet;
  const hasExternalWallet = !!externalWallet;

  // Gasless is available for email/Google users with embedded wallet
  const isGaslessAvailable = useMemo(() => {
    return isEmailOrSocialLogin && hasEmbeddedWallet && isChainSupportedForGasless(chainId);
  }, [isEmailOrSocialLogin, hasEmbeddedWallet, chainId]);

  // Get the address that will be used for attestations
  // Email/Google users use embedded wallet, others use external wallet
  const attestationAddress = useMemo(() => {
    if (isEmailOrSocialLogin && embeddedWallet) {
      return embeddedWallet.address;
    }
    if (externalWallet) {
      return externalWallet.address;
    }
    return null;
  }, [isEmailOrSocialLogin, embeddedWallet, externalWallet]);

  const getAttestationSigner = useCallback(
    async (rawTargetChainId: number | string): Promise<Signer> => {
      // The chainId can arrive as a string when it originates from the
      // indexer's JSON-encoded fields. Coerce up-front so downstream
      // strict-equality checks (`appNetwork.find`, switch cases) work.
      const targetChainId =
        typeof rawTargetChainId === "string" ? Number(rawTargetChainId) : rawTargetChainId;
      if (!Number.isFinite(targetChainId)) {
        throw new Error(`Invalid chain ID: ${rawTargetChainId}`);
      }
      // Track the most recent diagnostic so the final throw can surface the
      // real cause instead of a generic "No wallet available" — silently
      // falling through after a catch hid the real Privy/embedded-wallet
      // error from users and from Sentry.
      let lastError: unknown;

      // Case 1: Email/Google login with gasless support
      if (isEmailOrSocialLogin && embeddedWallet && isChainSupportedForGasless(targetChainId)) {
        try {
          await embeddedWallet.switchChain(targetChainId);

          // Create signer compatible with gasless providers
          const signer = await createPrivySignerForGasless(embeddedWallet, targetChainId);

          // Create gasless client (provider is selected automatically based on chain config)
          const client = await createGaslessClient(targetChainId, signer);

          if (client) {
            // Convert to ethers.js signer for GAP SDK compatibility
            const ethersSigner = await getGaslessSigner(client, targetChainId);
            return await assertSignerOnChain(ethersSigner, targetChainId);
          }

          // No client returned — record a synthetic diagnostic so the final
          // throw isn't "No wallet available" when gasless creation silently
          // returned null.
          lastError = new Error(
            `Gasless client creation returned no client for chain ${targetChainId}`
          );
        } catch (error) {
          // Don't fall back for gasless provider errors - show the actual error
          if (error instanceof GaslessProviderError) {
            console.error(`[Gasless] ${error.provider} provider failed:`, error);
            throw error;
          }

          // Log and fall back for other errors
          console.warn("[Gasless] Client creation failed, falling back to embedded wallet:", error);
          lastError = error;
        }
      }

      // Case 2: Email/Google login - use embedded wallet directly (user pays gas)
      // This handles: gasless fallback failures AND chains that don't support gasless
      if (isEmailOrSocialLogin && embeddedWallet) {
        try {
          const buildEmbeddedSigner = async (): Promise<Signer> => {
            await embeddedWallet.switchChain(targetChainId);
            const provider = await embeddedWallet.getEthereumProvider();
            return new BrowserProvider(provider).getSigner();
          };

          let signer = await buildEmbeddedSigner();
          let signerChainId = await getSignerChainId(signer);
          // Privy's switchChain can resolve before getEthereumProvider reports
          // the new chain. Rebuild once to absorb that propagation race; the
          // BrowserProvider is intentionally left un-pinned here so it reflects
          // the wallet's real chain rather than masking a genuine mismatch.
          if (signerChainId !== targetChainId) {
            signer = await buildEmbeddedSigner();
            signerChainId = await getSignerChainId(signer);
          }
          if (signerChainId !== targetChainId) {
            throw chainMismatchError(targetChainId, signerChainId);
          }
          return signer;
        } catch (error) {
          console.warn("[Gasless] Embedded wallet error:", error);
          lastError = error;
        }
      }

      // Case 3: Wallet login (MetaMask) - use external wallet directly, user pays gas.
      // Primary path: create a viem WalletClient from Privy's provider to avoid wagmi
      // state desync (chain?.id can be undefined during startup, causing wagmi's
      // getWalletClient to fail). This follows the same pattern used in claim-funds.
      // Fallback: wagmi's getWalletClient for environments where Privy provider isn't available.
      if (externalWallet) {
        try {
          await externalWallet.switchChain(targetChainId);
          const provider = await externalWallet.getEthereumProvider();
          const chain = resolveChain(targetChainId);
          if (!chain) {
            throw new Error(`Unsupported chain: ${targetChainId}`);
          }
          const viemClient = createWalletClient({
            account: externalWallet.address as `0x${string}`,
            chain,
            transport: custom(provider),
          });
          const signer = await walletClientToSigner(viemClient);
          if (!signer) {
            throw new Error("Failed to create signer from Privy wallet client");
          }
          return signer;
        } catch (setupError) {
          // Don't say "Privy provider failed" here — the failure can be
          // anything inside the external-wallet setup (switchChain, the
          // chain catalog lookup, the WalletClient build). Privy is just
          // one of several things involved.
          console.warn("[External Wallet] Setup failed, falling back to wagmi:", setupError);
          const { walletClient, error } = await safeGetWalletClient(targetChainId);

          if (error || !walletClient) {
            throw new Error(`Failed to get wallet client: ${error || "Unknown error"}`);
          }

          const signer = await walletClientToSigner(walletClient);

          if (!signer) {
            throw new Error("Failed to create signer from wallet client");
          }

          return signer;
        }
      }

      // No wallet path returned a signer. If an earlier path threw, surface
      // that real error — "No wallet available" was misleading because the
      // user had a wallet, it just failed during signer construction.
      if (lastError) {
        const message = lastError instanceof Error ? lastError.message : String(lastError);
        const wrapped = new Error(`Failed to obtain signer from embedded wallet: ${message}`);
        if (lastError instanceof Error && lastError.stack) {
          wrapped.stack = lastError.stack;
        }
        throw wrapped;
      }

      throw new Error("No wallet available for signing");
    },
    [isEmailOrSocialLogin, embeddedWallet, externalWallet]
  );

  return {
    getAttestationSigner,
    isGaslessAvailable,
    attestationAddress,
    hasEmbeddedWallet,
    hasExternalWallet,
  };
}
