import type { TNetwork } from "@show-karma/karma-gap-sdk";
import { GAP } from "@show-karma/karma-gap-sdk/core/class/GAP";
import { GapIndexerClient } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/GapIndexerClient";
import { chainIdToNetwork, Networks } from "@show-karma/karma-gap-sdk/core/consts";
import { envVars } from "@/utilities/enviromentVars";
import { getGapRpcConfig } from "@/utilities/gapRpcConfig";
import { appNetwork } from "@/utilities/network";

const gapClients: Record<number, GAP> = {};

/**
 * Resolve a chain ID to the SDK's internal network name. We rely on the
 * SDK's own `chainIdToNetwork` map (and double-check it against `Networks`)
 * rather than maintaining a parallel switch in the app — drift between
 * them previously surfaced as 'unsupported chain' errors for chains the
 * SDK actually supports (e.g., Optimism Sepolia / 11155420). Accepts
 * loose inputs (string, undefined) so a stringified chain ID from the
 * indexer doesn't fall through to a bogus default.
 */
const getSupportedNetworkForChain = (chainID: unknown): TNetwork | null => {
  const id = typeof chainID === "string" ? Number(chainID) : chainID;
  if (typeof id !== "number" || !Number.isFinite(id)) return null;
  const network = chainIdToNetwork[id as keyof typeof chainIdToNetwork] as TNetwork | undefined;
  if (!network) return null;
  return Object.hasOwn(Networks, network) ? network : null;
};

const findDefaultSupportedChainId = (): number | undefined => {
  const fallbackChain = appNetwork.find((chain) => !!getSupportedNetworkForChain(chain.id));
  return fallbackChain?.id;
};

export const getDefaultGapChainId = (): number | undefined => findDefaultSupportedChainId();

const createGapInstance = (network: TNetwork): GAP => {
  const apiUrl = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
  return new GAP({
    globalSchemas: false,
    network,
    rpcUrls: getGapRpcConfig(),
    ...(apiUrl?.trim()
      ? {
          apiClient: new GapIndexerClient(apiUrl),
        }
      : {}),
  });
};

export const getGapClient = (chainID: number): GAP => {
  const network = getSupportedNetworkForChain(chainID);
  if (!network) {
    throw new Error(`This network (chain ID ${chainID}) is not supported yet.`);
  }
  // Cache key from the SDK's authoritative chainId for the network — survives
  // any string/number coercion the caller may have done.
  const networkChainId = (Networks[network] as { chainId: number }).chainId;
  return (
    gapClients[networkChainId] ??
    (() => {
      const client = createGapInstance(network);
      gapClients[networkChainId] = client;
      return client;
    })()
  );
};
