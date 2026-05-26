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

/**
 * Alchemy network subdomains by chain ID. Chains absent here (e.g. Lisk, Sei)
 * have no Alchemy endpoint and keep using their NEXT_PUBLIC_RPC_* URL. Deriving
 * URLs from the single NEXT_PUBLIC_ALCHEMY_KEY keeps key rotation in one place
 * and avoids stale keys getting embedded in per-chain RPC URLs.
 */
const ALCHEMY_SUBDOMAIN_BY_CHAIN_ID: Partial<Record<number, string>> = {
  [mainnet.id]: "eth-mainnet",
  [optimism.id]: "opt-mainnet",
  [arbitrum.id]: "arb-mainnet",
  [base.id]: "base-mainnet",
  [polygon.id]: "polygon-mainnet",
  [celo.id]: "celo-mainnet",
  [scroll.id]: "scroll-mainnet",
  [optimismSepolia.id]: "opt-sepolia",
  [baseSepolia.id]: "base-sepolia",
  [sepolia.id]: "eth-sepolia",
};

/**
 * Alchemy keys are alphanumeric with optional `-`/`_`. Reject anything else so a
 * malformed value (e.g. a full URL pasted into NEXT_PUBLIC_ALCHEMY_KEY) can't
 * produce a broken endpoint that silently fails every request.
 */
const ALCHEMY_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

const normalizeRPCUrl = (rpcUrl?: string): string | undefined => {
  const normalizedRpcUrl = rpcUrl?.trim();
  return normalizedRpcUrl ? normalizedRpcUrl : undefined;
};

/**
 * Build a chain's Alchemy RPC URL from the shared key alone. Returns undefined
 * when the chain has no Alchemy endpoint or the key is missing/malformed, so
 * callers fall through to the configured URL or the chain's public default.
 */
export const buildAlchemyRpcUrl = (chainId: number, key?: string): string | undefined => {
  const subdomain = ALCHEMY_SUBDOMAIN_BY_CHAIN_ID[chainId];
  const trimmedKey = key?.trim();
  if (!subdomain || !trimmedKey || !ALCHEMY_KEY_PATTERN.test(trimmedKey)) {
    return undefined;
  }
  return `https://${subdomain}.g.alchemy.com/v2/${trimmedKey}`;
};

const CHAIN_BY_NETWORK: Record<string, Chain> = {
  mainnet,
  optimism,
  arbitrum,
  base,
  "base-sepolia": baseSepolia,
  celo,
  lisk,
  "optimism-sepolia": optimismSepolia,
  polygon,
  scroll,
  sei,
  sepolia,
};

const clientCache = new Map<string, PublicClient>();

function getOrCreateClient(network: string): PublicClient | undefined {
  const existing = clientCache.get(network);
  if (existing) return existing;

  const chain = CHAIN_BY_NETWORK[network];
  if (!chain) return undefined;

  const client = createPublicClient({
    chain,
    transport: http(getRPCUrlByChainId(chain.id)),
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

/**
 * Resolve a chain's RPC URL. Precedence: Alchemy (built from the shared
 * NEXT_PUBLIC_ALCHEMY_KEY) → explicit NEXT_PUBLIC_RPC_* override → public
 * default. Alchemy wins so rotating the one key takes effect without having to
 * also clear a stale per-chain URL.
 */
export const getRPCUrlByChainId = (chainId: number): string | undefined => {
  return (
    buildAlchemyRpcUrl(chainId, envVars.ALCHEMY_KEY) ||
    normalizeRPCUrl(getConfiguredRPCUrlByChainId(chainId)) ||
    DEFAULT_RPC_URLS_BY_CHAIN_ID[chainId]
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
