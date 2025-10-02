"use client";

import { usePrivy } from "@privy-io/react-auth";

/**
 * Replacement for RainbowKit's useConnectModal hook
 * Uses Privy's login method to open the authentication modal
 */
export function useConnectModal() {
  const { login, ready } = usePrivy();

  return {
    openConnectModal: ready ? login : undefined,
    connectModalOpen: false, // Privy doesn't expose modal state
  };
}