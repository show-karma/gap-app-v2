"use client";

import type { JsonRpcProvider, JsonRpcSigner } from "@ethersproject/providers";
import { providers } from "ethers";
import { useEffect, useMemo, useState } from "react";
import {
  PublicClient,
  type HttpTransport,
  Client,
  Transport,
  Chain,
  Account,
} from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

export function publicClientToProvider(client: Client<Transport, Chain>) {
  const { chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  if (transport.type === "fallback")
    return new providers.FallbackProvider(
      (transport.transports as ReturnType<Transport>[]).map(
        ({ value }) => new providers.JsonRpcProvider(value?.url, network)
      )
    );
  return new providers.JsonRpcProvider(transport.url, network);
}

export function walletClientToSigner(
  client: Client<Transport, Chain, Account>
) {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new providers.Web3Provider(transport, network);
  const signer = provider.getSigner(account.address);
  return signer;
}

export function useSigner() {
  const { data: walletClient } = useWalletClient();
  const { isConnected, address } = useAccount();

  const [signer, setSigner] = useState<JsonRpcSigner | undefined>(undefined);
  useMemo(() => {
    if (!isConnected) {
      setSigner(undefined);
      return;
    }
    async function getSigner() {
      if (!walletClient) return;

      const tmpSigner = walletClientToSigner(walletClient);

      setSigner(tmpSigner);
    }

    getSigner();
  }, [walletClient, address]);
  return signer;
}

export function useProvider() {
  const publicClient = usePublicClient();

  const [provider, setProvider] = useState<JsonRpcProvider | undefined>(
    undefined
  );
  useEffect(() => {
    async function getSigner() {
      if (!publicClient) return;

      const tmpProvider = publicClientToProvider(publicClient);

      setProvider(tmpProvider as JsonRpcProvider);
    }

    getSigner();
  }, [publicClient]);
  return provider;
}
