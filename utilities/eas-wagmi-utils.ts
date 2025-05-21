"use client";
import {
  BrowserProvider,
  FallbackProvider,
  JsonRpcProvider,
  JsonRpcSigner,
} from "ethers";
import { useEffect, useState } from "react";
import type { Account, Chain, Client, Transport } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";

export function publicClientToProvider(client: Client<Transport, Chain>) {
  const { chain, transport } = client;
  if (!chain) return;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  if (transport.type === "fallback") {
    const providers = (transport.transports as ReturnType<Transport>[]).map(
      ({ value }) => new JsonRpcProvider(value?.url, network)
    );
    if (providers.length === 1) return providers[0];
    return new FallbackProvider(providers);
  }
  return new JsonRpcProvider(transport.url, network);
}

export async function walletClientToSigner(
  client: Client<Transport, Chain, Account>
) {
  const { account, chain, transport } = client;
  if (!chain) return;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account?.address);
  return signer;
}

export function useSigner() {
  const { data: walletClient } = useWalletClient();

  const [signer, setSigner] = useState<JsonRpcSigner | undefined>(undefined);
  useEffect(() => {
    async function getSigner() {
      if (!walletClient) return;

      const tmpSigner: any = await walletClientToSigner(walletClient);

      setSigner(tmpSigner);
    }

    getSigner();
  }, [walletClient]);
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

      const tmpProvider: any = publicClientToProvider(publicClient);

      setProvider(tmpProvider);
    }

    getSigner();
  }, [publicClient]);
  return provider;
}
