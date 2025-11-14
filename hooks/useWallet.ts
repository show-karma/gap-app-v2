import { useSwitchChain } from "wagmi"
import { errorManager } from "@/components/Utilities/errorManager"

export const useWallet = () => {
  const { switchChainAsync: wagmiSwitchChainAsync, isPending: wagmiIsPending } = useSwitchChain()

  const switchChainAsync = async ({ chainId }: { chainId: number }) => {
    await wagmiSwitchChainAsync?.({ chainId }).catch((error) => {
      errorManager("Failed to switch chain", error, {
        targetNetwork: chainId,
      })
      throw error
    })
  }

  return { switchChainAsync, isPending: wagmiIsPending }
}
