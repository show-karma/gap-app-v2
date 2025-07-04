"use client";
import { useCallback, useMemo } from "react";
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

export const useWallet = () => {
  const { handleLogOut, primaryWallet, setShowAuthFlow } = useDynamicContext();
  const { chain } = useAccount();
  const isLoggedIn = useIsLoggedIn();

  const { switchChainAsync: wagmiSwitchChainAsync, isPending: wagmiIsPending } =
    useSwitchChain();

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

  const getSigner = useCallback(async () => {
    let client;
    if (!primaryWallet) {
      throw new Error("No primary wallet");
    }
    if (isEthereumWallet(primaryWallet)) {
      client = await primaryWallet?.getWalletClient();
    }
    const connector = primaryWallet.connector as EthereumWalletConnector;
    if (isZeroDevConnector(connector)) {
      const rpcsFromChain = rpcs[chain?.id || 0];
      if (!rpcsFromChain) {
        throw new Error("No RPCs for chain");
      }
      client = await connector.getAccountAbstractionProvider();

      const signer = await getKernelClient({
        account: client.account,
        chain: client.chain,
        bundlerURL: rpcsFromChain.bundler,
        paymasterURL: rpcsFromChain.paymaster,
      });
      return signer;
    }
    if (!client) {
      throw new Error("No client");
    }

    return client;
  }, [primaryWallet, chain]);

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
