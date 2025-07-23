import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
	coinbaseWallet,
	injectedWallet,
	metaMaskWallet,
	rabbyWallet,
	rainbowWallet,
	walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { cookieStorage, createConfig, createStorage, http } from "@wagmi/core";
import {
	arbitrum,
	baseSepolia,
	celo,
	lisk,
	optimism,
	optimismSepolia,
	scroll,
	sei,
	sepolia,
} from "@wagmi/core/chains";
import { envVars } from "../enviromentVars";
import { appNetwork } from "../network";

const connectors = connectorsForWallets(
	[
		{
			groupName: "Recommended",
			wallets: [
				metaMaskWallet,
				rabbyWallet,
				coinbaseWallet,
				walletConnectWallet,
				injectedWallet,
				rainbowWallet,
			],
		},
	],
	{
		appName: "Karma GAP",
		projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
		appDescription: "Karma GAP",
		appUrl: "https://gap.karmahq.xyz",
		appIcon: "https://gap.karmahq.xyz/favicon.ico",
	},
);

export const config = createConfig({
	chains: appNetwork,
	connectors,
	transports: {
		[optimism.id]: http(envVars.RPC.OPTIMISM),
		[arbitrum.id]: http(envVars.RPC.ARBITRUM),
		[baseSepolia.id]: http(envVars.RPC.BASE_SEPOLIA),
		[optimismSepolia.id]: http(envVars.RPC.OPT_SEPOLIA),
		[celo.id]: http(envVars.RPC.CELO),
		[sei.id]: http(envVars.RPC.SEI),
		[sepolia.id]: http(envVars.RPC.SEPOLIA),
		[lisk.id]: http(envVars.RPC.LISK),
		[scroll.id]: http(envVars.RPC.SCROLL),
	},
	ssr: true,
	storage: createStorage({
		storage: cookieStorage,
	}),
});

export function getWagmiConfig() {
	return config;
}
