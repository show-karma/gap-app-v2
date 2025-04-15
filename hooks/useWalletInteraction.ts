import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { Chain, createWalletClient, custom, Hex } from "viem";
import { useAccount, useAccountEffect, useChainId, useDisconnect } from "wagmi";

export function useWalletInteraction() {
  const { user, ready, authenticated, login, logout: privyLogout } = usePrivy();
  const { chain: wagmiChain } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { wallets } = useWallets();
  const isConnected = ready && authenticated && wallets.length !== 0;
  const chain = wagmiChain;
  const address =
    user && (wallets[0]?.address as `0x${string}`)
      ? (wallets[0]?.address as `0x${string}`)
      : null;
  const connector = wallets[0];

  const getClient = async (selectedChain: Chain) => {
    const provider = await connector.getEthereumProvider();
    const walletClient = createWalletClient({
      account: connector.address as Hex,
      chain: selectedChain,
      transport: custom(provider),
    });
    return walletClient;
  };

  useAccountEffect({
    onDisconnect: () => {
      if (authenticated) {
        privyLogout().catch(() => {});
      }
    },
  });

  // const logout = () => {
  //   privyLogout();
  //   disconnect();
  // };

  return {
    isConnected,
    chain,
    address,
    connector,
    login,
    logout: disconnect,
    getClient,
  };
}
