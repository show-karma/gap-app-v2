"use client";
import type { JsonRpcProvider, JsonRpcSigner } from "ethers";
import { useEffect, useState } from "react";
import type { Account, Chain, Client, Transport } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";

export async function publicClientToProvider(client: Client<Transport, Chain>) {
  const { chain, transport } = client;
  if (!chain) return;
  const { JsonRpcProvider, FallbackProvider } = await import("ethers");
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  /**
   * The chain is already known — it came from the wagmi client — so there is
   * nothing to detect. Without this, ethers probes `eth_chainId` on startup
   * and, whenever the RPC is unreachable, retries every second forever with no
   * backoff and no ceiling: "JsonRpcProvider failed to detect network and
   * cannot start up; retry in 1s", hundreds of times per session, burning CPU
   * and drowning the console. `staticNetwork` skips the probe entirely and
   * also spares one RPC round trip per call on healthy networks.
   */
  const options = { staticNetwork: true };
  if (transport.type === "fallback") {
    const providers = (transport.transports as ReturnType<Transport>[]).map(
      ({ value }) => new JsonRpcProvider(value?.url, network, options)
    );
    if (providers.length === 1) return providers[0];
    return new FallbackProvider(providers);
  }
  return new JsonRpcProvider(transport.url, network, options);
}

export async function walletClientToSigner(client: Client<Transport, Chain, Account>) {
  const { account, chain, transport } = client;
  if (!chain) return;
  const { BrowserProvider, JsonRpcSigner } = await import("ethers");
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

  const [provider, setProvider] = useState<JsonRpcProvider | undefined>(undefined);
  useEffect(() => {
    async function getSigner() {
      if (!publicClient) return;

      const tmpProvider: any = await publicClientToProvider(publicClient);

      setProvider(tmpProvider);
    }

    getSigner();
  }, [publicClient]);
  return provider;
}
