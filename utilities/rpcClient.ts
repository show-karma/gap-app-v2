import { createPublicClient, http } from "viem";
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
} from "viem/chains";
import { envVars } from "./enviromentVars";
import { getChainNameById } from "./network";

const optimismClient = createPublicClient({
	chain: optimism,
	transport: http(envVars.RPC.OPTIMISM),
});

const arbitrumClient = createPublicClient({
	chain: arbitrum,
	transport: http(envVars.RPC.ARBITRUM),
});

const baseSepoliaClient = createPublicClient({
	chain: baseSepolia,
	transport: http(envVars.RPC.BASE_SEPOLIA),
});

const optimismSepoliaClient = createPublicClient({
	chain: optimismSepolia,
	transport: http(envVars.RPC.OPT_SEPOLIA),
});

const sepoliaClient = createPublicClient({
	chain: sepolia,
	transport: http(envVars.RPC.SEPOLIA),
});

const celoClient = createPublicClient({
	chain: celo,
	transport: http(envVars.RPC.CELO),
});

const seiClient = createPublicClient({
	chain: sei,
	transport: http(envVars.RPC.SEI),
});

const liskClient = createPublicClient({
	chain: lisk,
	transport: http(envVars.RPC.LISK),
});

const scrollClient = createPublicClient({
	chain: scroll,
	transport: http(envVars.RPC.SCROLL),
});

export const rpcClient = {
	//   prod networks
	optimism: optimismClient,
	sei: seiClient,
	arbitrum: arbitrumClient,
	celo: celoClient,
	lisk: liskClient,
	scroll: scrollClient,
	//   testnets
	optimismSepolia: optimismSepoliaClient,
	sepolia: sepoliaClient,
	baseSepolia: baseSepoliaClient,
};

export const getRPCClient = async (chainId: number) => {
	const chainName = getChainNameById(chainId);
	const client = rpcClient[chainName as keyof typeof rpcClient];
	return client;
};
