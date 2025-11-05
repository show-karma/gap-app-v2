import { createPublicClient, http, type PublicClient } from "viem";
import {
  arbitrum,
  baseSepolia,
  celo,
  optimism,
  optimismSepolia,
  sei,
  sepolia,
  lisk,
  scroll,
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

export const getRPCUrlByChainId = (chainId: number): string | undefined => {
  switch (chainId) {
    case 1:
      return envVars.RPC.MAINNET;
    case 10:
      return envVars.RPC.OPTIMISM;
    case 42161:
      return envVars.RPC.ARBITRUM;
    case 8453:
      return envVars.RPC.BASE;
    case 42220:
      return envVars.RPC.CELO;
    case 137:
      return envVars.RPC.POLYGON;
    case 11155420:
      return envVars.RPC.OPT_SEPOLIA;
    case 11155111:
      return envVars.RPC.SEPOLIA;
    case 84532:
      return envVars.RPC.BASE_SEPOLIA;
    case 1329:
      return envVars.RPC.SEI;
    case 1135:
      return envVars.RPC.LISK;
    case 534352:
      return envVars.RPC.SCROLL;
    default:
      return undefined;
  }
};

export const getRPCClient = async (chainId: number): Promise<PublicClient> => {
  const chainName = getChainNameById(chainId);
  const client =
    rpcClient[chainName as keyof typeof rpcClient] ??
    (chainName === "base-sepolia" ? baseSepoliaClient : undefined) ??
    (chainName === "optimism-sepolia" ? optimismSepoliaClient : undefined);
  if (!client) {
    throw new Error(`RPC client not configured for chain ${chainId}`);
  }

  return client as unknown as PublicClient;
};
