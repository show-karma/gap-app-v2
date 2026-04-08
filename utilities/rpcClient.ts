import type { TNetwork } from "@show-karma/karma-gap-sdk";
import { createPublicClient, http, type PublicClient } from "viem";
import type { Chain } from "viem/chains";
import {
  arbitrum,
  base,
  baseSepolia,
  celo,
  lisk,
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  scroll,
  sei,
  sepolia,
} from "viem/chains";
import { envVars } from "./enviromentVars";
import { getChainNameById } from "./network";

const DEFAULT_RPC_URLS_BY_CHAIN_ID: Partial<Record<number, string>> = {
  [mainnet.id]: mainnet.rpcUrls.default.http[0],
  [optimism.id]: optimism.rpcUrls.default.http[0],
  [arbitrum.id]: arbitrum.rpcUrls.default.http[0],
  [base.id]: base.rpcUrls.default.http[0],
  [celo.id]: celo.rpcUrls.default.http[0],
  [polygon.id]: polygon.rpcUrls.default.http[0],
  [optimismSepolia.id]: optimismSepolia.rpcUrls.default.http[0],
  [sepolia.id]: sepolia.rpcUrls.default.http[0],
  [baseSepolia.id]: baseSepolia.rpcUrls.default.http[0],
  [sei.id]: sei.rpcUrls.default.http[0],
  [lisk.id]: lisk.rpcUrls.default.http[0],
  [scroll.id]: scroll.rpcUrls.default.http[0],
};

const normalizeRPCUrl = (rpcUrl?: string): string | undefined => {
  const normalizedRpcUrl = rpcUrl?.trim();
  return normalizedRpcUrl ? normalizedRpcUrl : undefined;
};

const CHAIN_CONFIG: Record<string, { chain: Chain; rpcUrl: string | undefined }> = {
  mainnet: { chain: mainnet, rpcUrl: envVars.RPC.MAINNET },
  optimism: { chain: optimism, rpcUrl: envVars.RPC.OPTIMISM },
  arbitrum: { chain: arbitrum, rpcUrl: envVars.RPC.ARBITRUM },
  base: { chain: base, rpcUrl: envVars.RPC.BASE },
  "base-sepolia": { chain: baseSepolia, rpcUrl: envVars.RPC.BASE_SEPOLIA },
  celo: { chain: celo, rpcUrl: envVars.RPC.CELO },
  lisk: { chain: lisk, rpcUrl: envVars.RPC.LISK },
  "optimism-sepolia": { chain: optimismSepolia, rpcUrl: envVars.RPC.OPT_SEPOLIA },
  polygon: { chain: polygon, rpcUrl: envVars.RPC.POLYGON },
  scroll: { chain: scroll, rpcUrl: envVars.RPC.SCROLL },
  sei: { chain: sei, rpcUrl: envVars.RPC.SEI },
  sepolia: { chain: sepolia, rpcUrl: envVars.RPC.SEPOLIA },
};

const clientCache = new Map<string, PublicClient>();

function getOrCreateClient(network: string): PublicClient | undefined {
  const existing = clientCache.get(network);
  if (existing) return existing;

  const config = CHAIN_CONFIG[network];
  if (!config) return undefined;

  const client = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  clientCache.set(network, client as PublicClient);
  return client as PublicClient;
}

type RpcClientNetwork = TNetwork | "mainnet" | "base" | "polygon";

export const rpcClient: Partial<Record<RpcClientNetwork, PublicClient>> = new Proxy(
  {} as Partial<Record<RpcClientNetwork, PublicClient>>,
  {
    get(_target, prop: string) {
      if (typeof prop !== "string") return undefined;
      return getOrCreateClient(prop);
    },
  }
);

const getConfiguredRPCUrlByChainId = (chainId: number): string | undefined => {
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

export const getRPCUrlByChainId = (chainId: number): string | undefined => {
  return (
    normalizeRPCUrl(getConfiguredRPCUrlByChainId(chainId)) || DEFAULT_RPC_URLS_BY_CHAIN_ID[chainId]
  );
};

export const getRPCClient = async (chainId: number): Promise<PublicClient> => {
  const chainName = getChainNameById(chainId);
  const client = rpcClient[chainName as RpcClientNetwork];
  if (!client) {
    throw new Error(`RPC client not configured for chain ${chainId}`);
  }

  return client as unknown as PublicClient;
};
