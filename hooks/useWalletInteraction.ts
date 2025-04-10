import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

export function useWalletInteraction() {
  const { user, ready, authenticated, login, logout } = usePrivy();
  const { chain: wagmiChain } = useAccount();
  const { wallets } = useWallets();
  const isConnected = ready && authenticated && wallets.length !== 0;
  const chain = wagmiChain;
  const address = user && (wallets[0]?.address as `0x${string}`);
  const connector = wallets[0];

  return {
    isConnected,
    chain,
    address,
    connector,
    login,
    logout,
  };
}
