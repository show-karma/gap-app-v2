"use client";

import { GAP } from "@show-karma/karma-gap-sdk/core/class/GAP";
import type { TNetwork } from "@show-karma/karma-gap-sdk";
import { Networks } from "@show-karma/karma-gap-sdk/core/consts";
import { GapIndexerClient } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/GapIndexerClient";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import {
  appNetwork,
  getChainIdByName,
  getChainNameById,
} from "@/utilities/network";
import { envVars } from "@/utilities/enviromentVars";
import { IpfsStorage } from "@show-karma/karma-gap-sdk/core/class/remote-storage/IpfsStorage";

const ipfsClient = new IpfsStorage({
  token: envVars.IPFS_TOKEN,
});

const gelatoOpts = {
  sponsorUrl: envVars.NEXT_PUBLIC_SPONSOR_URL || "/api/sponsored-txn",
  useGasless: false,
};

const gapClients: Record<number, GAP> = {};

const isSupportedNetwork = (network: string): network is TNetwork =>
  Object.prototype.hasOwnProperty.call(Networks, network);

const getSupportedNetworkForChain = (chainID: number): TNetwork | null => {
  const candidate = getChainNameById(chainID);
  return isSupportedNetwork(candidate) ? candidate : null;
};

const findDefaultSupportedChainId = (): number | undefined => {
  const fallbackChain = appNetwork.find((chain) =>
    isSupportedNetwork(getChainNameById(chain.id))
  );
  return fallbackChain?.id;
};

export const getDefaultGapChainId = (): number | undefined =>
  findDefaultSupportedChainId();

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
      // uncomment to use the API client
      ...(apiUrl && apiUrl.trim()
        ? {
            apiClient: new GapIndexerClient(apiUrl),
          }
        : {}),
      remoteStorage: ipfsClient,
    });
    gapClients[networkChainId] = client;
    return client;
  }
  return gapClient;
};

export const useGap = () => {
  const [gap, setGapClient] = useState<GAP>();
  const { chain } = useAccount();
  const defaultSupportedChainId = useMemo(findDefaultSupportedChainId, []);

  const updateGapClient = useCallback(
    (chainId: number) => {
      const network = getSupportedNetworkForChain(chainId);
      if (!network) {
        console.warn(`GAP::Unsupported chain ${chainId}. GAP client disabled.`);
        setGapClient(undefined);
        return;
      }

      const normalizedChainId = getChainIdByName(network);

      try {
        const client = getGapClient(normalizedChainId);
        setGapClient(client);
      } catch (error) {
        console.error("GAP::Failed to initialize client", error);
        setGapClient(undefined);
      }
    },
    []
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
