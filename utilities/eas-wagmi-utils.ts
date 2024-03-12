"use client";

import type { JsonRpcProvider, JsonRpcSigner } from "@ethersproject/providers";
import type { PublicClient, WalletClient } from "@wagmi/core";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { type HttpTransport } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";

export function publicClientToProvider(publicClient: PublicClient) {
  const { chain, transport } = publicClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  if (transport.type === "fallback")
    return new ethers.FallbackProvider(
      (transport.transports as ReturnType<HttpTransport>[]).map(
        ({ value }) => new ethers.JsonRpcProvider(value?.url, network)
      )
    );
  return new ethers.JsonRpcProvider(transport.url, network);
}

export async function walletClientToSigner(walletClient: WalletClient) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new ethers.BrowserProvider(transport, network);
  const signer = await provider
    .getSigner(account.address)
    .catch(() => undefined);

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
