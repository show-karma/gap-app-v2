// import { walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
// import { WalletConnectConnector } from "@wagmi/core/connectors/walletConnect";
// import { EthereumProvider } from "@walletconnect/ethereum-provider";
// import type { Chain } from "viem";

let wcProvider: any;

// // this implementation is fixing an issue on WalletConnect when use 'eth_signTypedData_v4' method
// WalletConnectConnector.prototype.getProvider = async function ({
//   chainId,
// } = {}) {
//   if (!wcProvider) {
//     const [defaultChain, ...optionalChains] = this.chains.map(
//       (chain) => chain.id
//     );

//     wcProvider = await EthereumProvider.init({
//       projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
//       chains: [defaultChain as any],
//       optionalChains,
//       showQrModal: false,
//       methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData_v4"],
//       rpcMap: Object.fromEntries(
//         this.chains.map((chain) => [chain.id, chain.rpcUrls.default.http[0]])
//       ) as any,
//     });
//   }

//   if (chainId) {
//     await this.switchChain(chainId);
//   }

//   return wcProvider;
// };

// export const customWalletConnectConnector = (chains: Chain[]) =>
//   walletConnectWallet({
//     chains,
//     projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
//     options: {
//       projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
//       metadata: {
//         name: "Karma GAP",
//         description: "Karma GAP",
//         url: "https://gap.karmahq.xyz",
//         icons: ["https://gap.karmahq.xyz/images/favicon.png"],
//       },
//     },
//   });
