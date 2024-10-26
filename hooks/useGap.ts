"use client";

import { GAP } from "@show-karma/karma-gap-sdk";
import {
  GapIndexerClient,
  IpfsStorage,
} from "@show-karma/karma-gap-sdk/core/class";
import { useEffect, useMemo, useState } from "react";
import { useChainId } from "wagmi";

import {
  appNetwork,
  getChainIdByName,
  getChainNameById,
} from "@/utilities/network";
import { envVars } from "@/utilities/enviromentVars";
import { usePrivy, useWallets } from "@privy-io/react-auth";

const ipfsClient = new IpfsStorage({
  token: envVars.IPFS_TOKEN,
});

const gelatoOpts = {
  sponsorUrl: envVars.NEXT_PUBLIC_SPONSOR_URL || "/api/sponsored-txn",
  useGasless: false,
};

const gapClients: Record<number, GAP> = {};

export const getGapClient = (chainID: number): GAP => {
  const network = getChainNameById(chainID);
  const gapClient = gapClients[getChainIdByName(network)];
  if (!gapClient) {
    const apiUrl = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
    const client = new GAP({
      globalSchemas: false,
      network,
      // uncomment to use the API client
      ...(apiUrl
        ? {
            apiClient: new GapIndexerClient(apiUrl),
          }
        : {}),
      remoteStorage: ipfsClient,
    });
    gapClients[chainID] = client;
    return client;
  }
  return gapClient;
};

export const useGap = () => {
  const [gap, setGapClient] = useState<GAP>();
  const { user, ready, authenticated } = usePrivy();
  const chainId = useChainId();
  const { wallets } = useWallets();
  const isConnected = ready && authenticated && wallets.length !== 0;
  const chain = appNetwork.find((c) => c.id === chainId);
  const address = user && (wallets[0]?.address as `0x${string}`);
  if (!gap) {
    const chainID =
      appNetwork.find((c) => c.id === chain?.id)?.id || appNetwork[0].id;
    setGapClient(getGapClient(chainID));
  }

  /**
   * Returns a GAP client
   * @param network
   * @param useGasless
   * @returns
   */
  const updateGapClient = (chainId: number) => {
    const gapClient = getGapClient(chainId);
    setGapClient(gapClient);
  };

  useEffect(() => {
    if (chain) {
      console.info("Updating GAP client", chain);
      updateGapClient(chain.id);
    }
  }, [chain]);

  return useMemo(() => ({ gap, updateGapClient }), [gap, chain]);
};
