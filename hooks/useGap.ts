"use client"

import type { TNetwork } from "@show-karma/karma-gap-sdk"
import { GAP } from "@show-karma/karma-gap-sdk/core/class/GAP"
import { GapIndexerClient } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/GapIndexerClient"
import { IpfsStorage } from "@show-karma/karma-gap-sdk/core/class/remote-storage/IpfsStorage"
import { Networks } from "@show-karma/karma-gap-sdk/core/consts"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useAccount } from "wagmi"
import { envVars } from "@/utilities/enviromentVars"
import {
  appNetwork,
  gapSupportedNetworks,
  getChainIdByName,
  getChainNameById,
} from "@/utilities/network"

const ipfsClient = new IpfsStorage({
  token: envVars.IPFS_TOKEN,
})

const _gelatoOpts = {
  sponsorUrl: envVars.NEXT_PUBLIC_SPONSOR_URL || "/api/sponsored-txn",
  useGasless: false,
}

const gapClients: Record<number, GAP> = {}

const isSupportedNetwork = (network: string): network is TNetwork =>
  Object.hasOwn(Networks, network)

const getSupportedNetworkForChain = (chainID: number): TNetwork | null => {
  const candidate = getChainNameById(chainID)
  return isSupportedNetwork(candidate) ? candidate : null
}

const findDefaultSupportedChainId = (): number | undefined => {
  const fallbackChain = appNetwork.find((chain) => isSupportedNetwork(getChainNameById(chain.id)))
  return fallbackChain?.id
}

export const getDefaultGapChainId = (): number | undefined => findDefaultSupportedChainId()

export const getGapClient = (chainID: number): GAP => {
  const network = getSupportedNetworkForChain(chainID)
  if (!network) {
    throw new Error(`GAP::Unsupported chain ${chainID}`)
  }
  const networkChainId = getChainIdByName(network)
  const gapClient = gapClients[networkChainId]
  if (!gapClient) {
    const apiUrl = envVars.NEXT_PUBLIC_GAP_INDEXER_URL
    const client = new GAP({
      globalSchemas: false,
      network,
      // uncomment to use the API client
      ...(apiUrl?.trim()
        ? {
            apiClient: new GapIndexerClient(apiUrl),
          }
        : {}),
      remoteStorage: ipfsClient,
    })
    gapClients[networkChainId] = client
    return client
  }
  return gapClient
}

export const useGap = () => {
  const [gap, setGapClient] = useState<GAP>()
  const [isUpdating, setIsUpdating] = useState(false)
  const { chain } = useAccount()
  const defaultSupportedChainId = useMemo(findDefaultSupportedChainId, [])

  const updateGapClient = useCallback(
    async (chainId: number) => {
      if (isUpdating) return
      setIsUpdating(true)

      const network = getSupportedNetworkForChain(chainId)

      if (!network) {
        // Unsupported chain - switch to first supported network
        const firstSupportedChain = gapSupportedNetworks[0]
        console.warn(
          `GAP::Unsupported chain ${chainId}. Switching to ${firstSupportedChain.name}...`
        )

        setGapClient(getGapClient(firstSupportedChain.id))
        return
      }

      // Supported chain - normal flow
      const normalizedChainId = getChainIdByName(network)

      try {
        const client = getGapClient(normalizedChainId)
        setGapClient(client)
      } catch (error) {
        console.error("GAP::Failed to initialize client", error)
        setGapClient(undefined)
      } finally {
        setIsUpdating(false)
      }
    },
    [isUpdating]
  )

  useEffect(() => {
    const targetChainId = chain?.id ?? defaultSupportedChainId
    if (!targetChainId) {
      setGapClient(undefined)
      return
    }

    updateGapClient(targetChainId)
  }, [chain?.id, defaultSupportedChainId, updateGapClient])

  return useMemo(() => ({ gap, updateGapClient }), [gap, updateGapClient])
}
