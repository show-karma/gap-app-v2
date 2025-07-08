"use client";
import { useCallback, useMemo, useRef, useEffect } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { useAccount, useSwitchChain } from "wagmi";
import {
  EthereumWalletConnector,
  isEthereumWallet,
} from "@dynamic-labs/ethereum";
import { isZeroDevConnector } from "@dynamic-labs/ethereum-aa";
import { getKernelClient } from "@show-karma/karma-gap-sdk/utils";
import { rpcs } from "@/utilities/account-abstraction/rpcs";
import { SignerOrProvider } from "@show-karma/karma-gap-sdk";
import { appNetwork } from "@/utilities/network";

type SignerCache = {
  [key: string]: SignerOrProvider;
};

type UseWalletReturn = {
  switchChainAsync: ({ chainId }: { chainId: number }) => Promise<void>;
  isPending: boolean;
  isLoggedIn: boolean;
  logout: (() => Promise<void>) | undefined;
  address: string | undefined;
  chain: any;
  openAuthFlow: () => Promise<void>;
  getSigner: (chainId?: number) => Promise<SignerOrProvider>;
};

export const useWallet = (): UseWalletReturn => {
  const { handleLogOut, primaryWallet, setShowAuthFlow } = useDynamicContext();
  const { chain } = useAccount();
  const isLoggedIn = useIsLoggedIn();
  const signerCacheRef = useRef<SignerCache>({});

  const { switchChainAsync: wagmiSwitchChainAsync, isPending: wagmiIsPending } =
    useSwitchChain();

  useEffect(() => {
    signerCacheRef.current = {};
  }, [primaryWallet?.address]);

  const switchChainAsync = useCallback(
    async ({ chainId }: { chainId: number }) => {
      await wagmiSwitchChainAsync?.({ chainId }).catch((error) => {
        errorManager("Failed to switch chain", error, {
          targetNetwork: chainId,
        });
        throw error;
      });
    },
    [wagmiSwitchChainAsync]
  );

  const openAuthFlow = useCallback(async () => {
    setShowAuthFlow?.(true);
  }, [setShowAuthFlow]);

  const getSigner = useCallback(
    async (chainId?: number): Promise<SignerOrProvider> => {
      const selectedChain =
        appNetwork.find((chain) => chain.id === chainId) ||
        chain ||
        appNetwork[0];

      if (!primaryWallet) {
        throw new Error("No primary wallet");
      }

      const cacheKey = `${primaryWallet.address}-${selectedChain.id}`;

      if (signerCacheRef.current[cacheKey]) {
        return signerCacheRef.current[cacheKey];
      }

      let client;
      if (isEthereumWallet(primaryWallet)) {
        client = await primaryWallet?.getWalletClient(
          selectedChain?.id.toString()
        );
      }
      const connector = primaryWallet.connector as EthereumWalletConnector;
      if (isZeroDevConnector(connector)) {
        const rpcsFromChain = rpcs[selectedChain?.id || 0];
        if (!rpcsFromChain) {
          throw new Error("No RPCs for chain");
        }
        client = await connector.getAccountAbstractionProvider({
          withSponsorship: true,
        });

        const signer = await getKernelClient({
          account: client.account,
          chain: selectedChain as any,
          bundlerURL: rpcsFromChain.bundler,
          paymasterURL: rpcsFromChain.paymaster,
        });
        signerCacheRef.current[cacheKey] = signer as any;
        return signer as any;
      }
      if (!client) {
        throw new Error("No client");
      }

      signerCacheRef.current[cacheKey] = client as SignerOrProvider;
      return client as SignerOrProvider;
    },
    [primaryWallet, chain]
  );

  return useMemo(
    () => ({
      switchChainAsync,
      isPending: wagmiIsPending,
      isLoggedIn,
      logout: handleLogOut,
      address: primaryWallet?.address,
      chain,
      openAuthFlow,
      getSigner,
    }),
    [
      switchChainAsync,
      wagmiIsPending,
      isLoggedIn,
      handleLogOut,
      primaryWallet?.address,
      chain,
      openAuthFlow,
      getSigner,
    ]
  );
};
