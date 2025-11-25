"use client"

import { useState } from "react"
import { useAccount, useChainId, useSwitchChain } from "wagmi"
import { useAuth } from "@/hooks/useAuth"
import { appNetwork } from "@/utilities/network"

interface ConnectButtonCustomProps {
  children: (props: {
    account: { address: string; displayName: string } | undefined
    chain: { id: number; name?: string } | undefined
    authenticationStatus: "authenticated" | "unauthenticated" | "loading"
    mounted: boolean
    login: () => void
  }) => React.ReactNode
}

/**
 * Custom ConnectButton component that mimics RainbowKit's ConnectButton.Custom
 * but uses Privy for authentication
 */
export function ConnectButtonCustom({ children }: ConnectButtonCustomProps) {
  const { ready, authenticated, login } = useAuth()
  const { address, isConnected, chain: currentChain } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [isChainModalOpen, setIsChainModalOpen] = useState(false)

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const account = address
    ? {
        address,
        displayName: formatAddress(address),
      }
    : undefined

  const chain = currentChain
    ? {
        id: currentChain.id,
        name: currentChain.name,
      }
    : undefined

  const authenticationStatus = !ready
    ? "loading"
    : authenticated
      ? "authenticated"
      : "unauthenticated"

  return (
    <>
      {children({
        account,
        chain,
        authenticationStatus,
        mounted: ready,
        login,
      })}

      {/* Chain Selector Modal */}
      {isChainModalOpen && isConnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black bg-opacity-50 border-none p-0 cursor-pointer"
            onClick={() => setIsChainModalOpen(false)}
            aria-label="Close network modal"
          />
          <div className="relative bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Switch Network
            </h2>
            <div className="space-y-2">
              {appNetwork.map((network) => (
                <button
                  key={network.id}
                  onClick={() => {
                    switchChain({ chainId: network.id })
                    setIsChainModalOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                    chainId === network.id
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                      : "hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {network.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsChainModalOpen(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// Wrapper to maintain compatibility with existing code
export const ConnectButton = {
  Custom: ConnectButtonCustom,
}
