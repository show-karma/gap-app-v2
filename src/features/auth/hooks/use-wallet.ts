import { errorManager } from "@/lib/utils/error-manager";
import { useSwitchChain } from "wagmi";

export const useWallet = () => {
  const { switchChainAsync: wagmiSwitchChainAsync, isPending: wagmiIsPending } =
    useSwitchChain();

  const switchChainAsync = async ({ chainId }: { chainId: number }) => {
    await wagmiSwitchChainAsync?.({ chainId }).catch((error) => {
      errorManager("Failed to switch chain", error, {
        targetNetwork: chainId,
      });
      throw error;
    });
  };

  return { switchChainAsync, isPending: wagmiIsPending };
};
