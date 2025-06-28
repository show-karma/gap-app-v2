import { useCallback, useMemo } from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { useAccount, useSwitchChain } from "wagmi";

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

  return useMemo(
    () => ({
      switchChainAsync,
      isPending: wagmiIsPending,
      isLoggedIn,
      logout: handleLogOut,
      address: primaryWallet?.address,
      chain,
      openAuthFlow,
    }),
    [
      switchChainAsync,
      wagmiIsPending,
      isLoggedIn,
      handleLogOut,
      primaryWallet?.address,
      chain,
      openAuthFlow,
    ]
  );
};
