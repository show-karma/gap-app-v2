import { getWalletConnectConnector } from "@rainbow-me/rainbowkit";
import { walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { EthereumProvider } from "@walletconnect/ethereum-provider";

let wcProvider: any;

const walletConnect = getWalletConnectConnector;

// this implementation is fixing an issue on WalletConnect when use 'eth_signTypedData_v4' method
walletConnect.prototype.getProvider = async function ({
  chainId = 1, // default value added here
} = {}) {
  if (!wcProvider) {
    const [defaultChain, ...optionalChains] = this.chains.map(
      (chain: any) => chain.id
    );

    wcProvider = await EthereumProvider.init({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
      chains: [defaultChain as any],
      optionalChains,
      showQrModal: false,
      methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData_v4"],
      rpcMap: Object.fromEntries(
        this.chains.map((chain: any) => [
          chain.id,
          chain.rpcUrls.default.http[0],
        ])
      ) as any,
    });
  }

  if (chainId) {
    await this.switchChain(chainId);
  }

  return wcProvider;
};

export const customWalletConnectConnector = () =>
  walletConnectWallet({
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
    options: {
      metadata: {
        name: "Karma GAP",
        description: "Karma GAP",
        url: "https://gap.karmahq.xyz",
        icons: ["https://gap.karmahq.xyz/favicon.png"],
      },
    },
  });
