import { appNetwork } from "@/utilities/network";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useChainId } from "wagmi";

export function useWalletInteraction() {
  const { user, ready, authenticated, login, logout } = usePrivy();
  const chainId = useChainId();
  const { wallets } = useWallets();
  const isConnected = ready && authenticated && wallets.length !== 0;
  const chain = appNetwork.find((c) => c.id === chainId);
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
