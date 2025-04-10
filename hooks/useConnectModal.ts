import { usePrivy } from "@privy-io/react-auth";

/**
 * A drop-in replacement for the Rainbow Kit's useConnectModal hook.
 * This uses Privy's login function to provide the same capabilities.
 */
export function useConnectModal() {
  const { login } = usePrivy();

  return {
    openConnectModal: login,
    connectModalOpen: false, // Privy doesn't expose this state, so default to false
  };
}
