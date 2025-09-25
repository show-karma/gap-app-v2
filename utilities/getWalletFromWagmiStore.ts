/**
 * Get the current wallet address from wagmi store
 *
 * Updated to work with Privy's wagmi integration.
 * This is a compatibility layer for existing code.
 */
export function getWalletFromWagmiStore(): string {
  // Check if we're on the client side
  if (typeof window === "undefined") {
    return "";
  }

  try {
    // With Privy + Wagmi, the store structure might be different
    // First try to get from localStorage where wagmi typically stores state
    const wagmiStore = localStorage.getItem("wagmi.store");

    if (wagmiStore) {
      const parsedStore = JSON.parse(wagmiStore);

      if (parsedStore?.state?.connections?.value) {
        const connections = parsedStore.state.connections.value;

        if (Array.isArray(connections) && connections.length > 0) {
          // Get the first connection's first account
          const firstConnection = connections[0];

          if (Array.isArray(firstConnection) && firstConnection.length > 1) {
            const connectionData = firstConnection[1];

            if (connectionData?.accounts && Array.isArray(connectionData.accounts)) {
              return connectionData.accounts[0] || "";
            }
          }
        }
      }

      // Alternative structure for newer wagmi versions
      if (parsedStore?.state?.current) {
        return parsedStore.state.current || "";
      }
    }

    // Fallback: Try to get from Privy's localStorage
    const privyUser = localStorage.getItem("privy:user");

    if (privyUser) {
      const parsedUser = JSON.parse(privyUser);

      // Check for wallet in Privy user data
      if (parsedUser?.wallet?.address) {
        return parsedUser.wallet.address;
      }

      // Check for linked accounts
      if (parsedUser?.linkedAccounts && Array.isArray(parsedUser.linkedAccounts)) {
        const walletAccount = parsedUser.linkedAccounts.find(
          (account: any) => account.type === "wallet"
        );

        if (walletAccount?.address) {
          return walletAccount.address;
        }
      }
    }
  } catch (error) {
    console.error("Error getting wallet from store:", error);
  }

  return "";
}