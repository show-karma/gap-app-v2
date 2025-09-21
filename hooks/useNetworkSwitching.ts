"use client";
import { useAccount, useChainId, useSwitchChain, useWalletClient } from "wagmi";
import { useCallback, useRef } from "react";
import { SUPPORTED_NETWORKS, isChainSupported } from "@/constants/supportedTokens";

export function useNetworkSwitching() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { data: walletClient, refetch: refetchWalletClient } = useWalletClient();

  const currentNetwork = chainId ? SUPPORTED_NETWORKS[chainId] : undefined;
  const isCurrentNetworkSupported = chainId ? isChainSupported(chainId) : false;

  // Keep track of the last successful chain switch to avoid unnecessary refreshes
  const lastSwitchedChain = useRef<number | null>(null);

  /**
   * Wait for wallet client to be available and on the correct chain
   */
  const waitForWalletClientRefresh = useCallback(async (
    expectedChainId: number,
    maxRetries = 15,
    delayMs = 1000
  ): Promise<boolean> => {
    console.log(`🔄 Waiting for wallet client refresh to chain ${expectedChainId}...`);

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Refetch the wallet client to get the latest state
        const { data: freshWalletClient } = await refetchWalletClient();

        if (freshWalletClient && freshWalletClient.chain?.id === expectedChainId) {
          console.log(`✅ Wallet client refreshed successfully for chain ${expectedChainId}`);
          return true;
        }

        // If we have a wallet client but on wrong chain, that's progress
        if (freshWalletClient && freshWalletClient.account) {
          console.log(`⏳ Wallet client available but on chain ${freshWalletClient.chain?.id}, expected ${expectedChainId} (attempt ${i + 1}/${maxRetries})`);
        } else {
          console.log(`❌ Wallet client not available (attempt ${i + 1}/${maxRetries})`);
        }

        // Progressive delay - start with shorter delays, increase over time
        const currentDelay = Math.min(delayMs * (1 + i * 0.3), 3000);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
      } catch (error) {
        console.warn(`⚠️ Wallet client refresh attempt ${i + 1} failed:`, error);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.warn(`⚠️ Wallet client refresh incomplete after ${maxRetries} attempts - returning current state`);
    return false;
  }, [refetchWalletClient]);

  /**
   * Verify that the chain switch was successful
   */
  const verifyChainSwitch = useCallback(async (
    expectedChainId: number,
    timeoutMs = 30000
  ): Promise<boolean> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      // Check if the current chain ID matches
      if (chainId === expectedChainId) {
        return true;
      }

      // Check via direct wallet query if available
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const provider = (window as any).ethereum;
          const currentChain = await provider.request({ method: "eth_chainId" });
          const currentChainDecimal = parseInt(currentChain, 16);

          if (currentChainDecimal === expectedChainId) {
            return true;
          }
        } catch (error) {
          console.warn("Failed to query chain via provider:", error);
        }
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return false;
  }, [chainId]);

  const switchToNetwork = useCallback(async (targetChainId: number) => {
    if (!isConnected) {
      throw new Error("Wallet not connected");
    }

    if (!isChainSupported(targetChainId)) {
      throw new Error(`Chain ID ${targetChainId} is not supported`);
    }

    if (chainId === targetChainId) {
      console.log(`Already on target chain ${targetChainId}`);
      return; // Already on target network
    }

    console.log(`Switching from chain ${chainId} to chain ${targetChainId}`);

    // Try different switching methods in order of preference
    let switchError: Error | null = null;
    let switchSuccessful = false;

    try {
      // Method 1: Use switchChainAsync (preferred)
      if (switchChainAsync) {
        console.log("Attempting switch via switchChainAsync");
        await switchChainAsync({ chainId: targetChainId });
        switchSuccessful = true;
      }
    } catch (error) {
      console.warn("switchChainAsync failed, trying wallet client:", error);
      switchError = error instanceof Error ? error : new Error("switchChainAsync failed");
    }

    if (!switchSuccessful) {
      try {
        // Method 2: Use wallet client switchChain
        if (walletClient && typeof walletClient.switchChain === "function") {
          console.log("Attempting switch via walletClient.switchChain");
          await walletClient.switchChain({ id: targetChainId });
          switchSuccessful = true;
        }
      } catch (error) {
        console.warn("walletClient.switchChain failed, trying switchChain:", error);
        switchError = error instanceof Error ? error : new Error("walletClient.switchChain failed");
      }
    }

    if (!switchSuccessful) {
      try {
        // Method 3: Use switchChain (returns promise in some implementations)
        if (switchChain) {
          console.log("Attempting switch via switchChain");
          const result = switchChain({ chainId: targetChainId });
          // If it returns a promise, wait for it
          if (result && typeof result.then === "function") {
            await result;
          }
          switchSuccessful = true;
        }
      } catch (error) {
        console.warn("switchChain failed:", error);
        switchError = error instanceof Error ? error : new Error("switchChain failed");
      }
    }

    // If all methods failed, throw the last error
    if (!switchSuccessful) {
      throw switchError || new Error("All network switching methods failed");
    }

    // Wait for the chain switch to be confirmed
    console.log("Waiting for chain switch confirmation...");
    const chainSwitchConfirmed = await verifyChainSwitch(targetChainId);

    if (!chainSwitchConfirmed) {
      throw new Error(`Chain switch to ${targetChainId} was not confirmed within timeout`);
    }

    console.log(`Chain switch to ${targetChainId} confirmed`);

    // Wait for wallet client to refresh and be available on the new chain
    console.log("🔄 Refreshing wallet client...");
    const walletClientRefreshed = await waitForWalletClientRefresh(targetChainId);

    if (!walletClientRefreshed) {
      console.warn(`⚠️ Wallet client did not refresh properly for chain ${targetChainId}, but continuing...`);
      // Don't throw an error here - let the transaction validation handle it
    } else {
      console.log(`✅ Wallet client refresh completed for chain ${targetChainId}`);
    }

    // Update the last switched chain
    lastSwitchedChain.current = targetChainId;
    console.log(`Successfully switched to chain ${targetChainId}`);
  }, [isConnected, chainId, switchChain, switchChainAsync, walletClient, verifyChainSwitch, waitForWalletClientRefresh]);

  const getSupportedNetworks = useCallback(() => {
    return Object.values(SUPPORTED_NETWORKS);
  }, []);

  /**
   * Get a fresh wallet client, optionally for a specific chain
   */
  const getFreshWalletClient = useCallback(async (expectedChainId?: number) => {
    try {
      const { data: freshClient } = await refetchWalletClient();

      if (expectedChainId && freshClient?.chain?.id !== expectedChainId) {
        console.warn(`Fresh wallet client is on chain ${freshClient?.chain?.id}, expected ${expectedChainId}`);
        return null;
      }

      return freshClient;
    } catch (error) {
      console.error("Failed to get fresh wallet client:", error);
      return null;
    }
  }, [refetchWalletClient]);

  return {
    currentChainId: chainId,
    currentNetwork,
    isCurrentNetworkSupported,
    isConnected,
    isSwitching,
    switchToNetwork,
    getSupportedNetworks,
    getFreshWalletClient,
    waitForWalletClientRefresh,
    verifyChainSwitch,
  };
}
