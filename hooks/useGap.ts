"use client";

import type { GAPRpcConfig, TNetwork } from "@show-karma/karma-gap-sdk";
import { GAP } from "@show-karma/karma-gap-sdk/core/class/GAP";
import { GapIndexerClient } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/GapIndexerClient";
import { chainIdToNetwork, Networks } from "@show-karma/karma-gap-sdk/core/consts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { envVars } from "@/utilities/enviromentVars";
import {
  appNetwork,
  gapSupportedNetworks,
  getChainIdByName,
  getChainNameById,
} from "@/utilities/network";
import { getRPCUrlByChainId } from "@/utilities/rpcClient";

const rpcConfig: GAPRpcConfig = Object.fromEntries(
  Object.keys(chainIdToNetwork)
    .map(Number)
    .map((chainId) => [chainId, getRPCUrlByChainId(chainId)])
    .filter(([, url]) => url)
);

export const getGapRpcConfig = (): GAPRpcConfig => rpcConfig;

const gapClients: Record<number, GAP> = {};

const isSupportedNetwork = (network: string): network is TNetwork =>
  Object.hasOwn(Networks, network);

const getSupportedNetworkForChain = (chainID: number): TNetwork | null => {
  const candidate = getChainNameById(chainID);
  return isSupportedNetwork(candidate) ? candidate : null;
};

const findDefaultSupportedChainId = (): number | undefined => {
  const fallbackChain = appNetwork.find((chain) => isSupportedNetwork(getChainNameById(chain.id)));
  return fallbackChain?.id;
};

export const getDefaultGapChainId = (): number | undefined => findDefaultSupportedChainId();

export const getGapClient = (chainID: number): GAP => {
  const network = getSupportedNetworkForChain(chainID);
  if (!network) {
    throw new Error(`GAP::Unsupported chain ${chainID}`);
  }
  const networkChainId = getChainIdByName(network);
  const gapClient = gapClients[networkChainId];
  if (!gapClient) {
    const apiUrl = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
    const client = new GAP({
      globalSchemas: false,
      network,
      rpcUrls: rpcConfig,
      ...(apiUrl?.trim()
        ? {
            apiClient: new GapIndexerClient(apiUrl),
          }
        : {}),
    });
    gapClients[networkChainId] = client;
    return client;
  }
  return gapClient;
};

export const useGap = () => {
  const [gap, setGapClient] = useState<GAP>();
  const [isUpdating, setIsUpdating] = useState(false);
  const { chain } = useAccount();
  const defaultSupportedChainId = useMemo(findDefaultSupportedChainId, []);

  const updateGapClient = useCallback(
    async (chainId: number) => {
      if (isUpdating) return;
      setIsUpdating(true);

      const network = getSupportedNetworkForChain(chainId);

      if (!network) {
        // Unsupported chain - switch to first supported network
        const firstSupportedChain = gapSupportedNetworks[0];
        console.warn(
          `GAP::Unsupported chain ${chainId}. Switching to ${firstSupportedChain.name}...`
        );

        setGapClient(getGapClient(firstSupportedChain.id));
        return;
      }

      // Supported chain - normal flow
      const normalizedChainId = getChainIdByName(network);

      try {
        const client = getGapClient(normalizedChainId);
        setGapClient(client);
      } catch (error) {
        console.error("GAP::Failed to initialize client", error);
        setGapClient(undefined);
      } finally {
        setIsUpdating(false);
      }
    },
    [isUpdating]
  );

  useEffect(() => {
    const targetChainId = chain?.id ?? defaultSupportedChainId;
    if (!targetChainId) {
      setGapClient(undefined);
      return;
    }

    updateGapClient(targetChainId);
  }, [chain?.id, defaultSupportedChainId, updateGapClient]);

  return useMemo(() => ({ gap, updateGapClient }), [gap, updateGapClient]);
};
