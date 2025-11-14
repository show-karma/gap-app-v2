"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { useAccount } from "wagmi"
import { faucetService } from "@/utilities/faucet/faucetService"

/**
 * Check if current wallet is the faucet owner
 */
export const useFaucetAdmin = () => {
  const { address, isConnecting } = useAccount()
  const { config, isLoading } = useFaucetConfig()

  return {
    isAdmin: address?.toLowerCase() === config?.faucetAddress.toLowerCase(),
    isLoading: isConnecting || isLoading,
  }
}

/**
 * Manage faucet configuration
 */
export const useFaucetConfig = () => {
  const queryClient = useQueryClient()

  const configQuery = useQuery({
    queryKey: ["faucet", "admin", "config"],
    queryFn: async () => {
      return faucetService.getConfiguration()
    },
    staleTime: 60000, // 1 minute
    retry: 1,
  })

  const updateGlobalConfigMutation = useMutation({
    mutationFn: faucetService.updateGlobalConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin", "config"] })
      toast.success("Global configuration updated")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update global configuration")
    },
  })

  const updateChainSettingsMutation = useMutation({
    mutationFn: ({ chainId, settings }: { chainId: number; settings: any }) => {
      return faucetService.updateChainSettings(chainId, settings)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin", "config"] })
      toast.success("Chain settings updated")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update chain settings")
    },
  })

  const createChainSettingsMutation = useMutation({
    mutationFn: faucetService.createChainSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin", "config"] })
      toast.success("Chain settings created")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create chain settings")
    },
  })

  const deleteChainSettingsMutation = useMutation({
    mutationFn: faucetService.deleteChainSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin", "config"] })
      toast.success("Chain settings deleted")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete chain settings")
    },
  })

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    error: configQuery.error,
    refetch: configQuery.refetch,
    updateGlobalConfig: updateGlobalConfigMutation.mutate,
    updateChainSettings: updateChainSettingsMutation.mutate,
    createChainSettings: createChainSettingsMutation.mutate,
    deleteChainSettings: deleteChainSettingsMutation.mutate,
    isUpdating:
      updateGlobalConfigMutation.isPending ||
      updateChainSettingsMutation.isPending ||
      createChainSettingsMutation.isPending ||
      deleteChainSettingsMutation.isPending,
  }
}

/**
 * Manage whitelisted contracts
 */
export const useWhitelistedContracts = (chainId?: number) => {
  const queryClient = useQueryClient()

  const contractsQuery = useQuery({
    queryKey: ["faucet", "admin", "whitelist", chainId ? chainId : ""],
    queryFn: async () => {
      return await faucetService.getWhitelistedContracts(chainId)
    },
  })

  const whitelistContractMutation = useMutation({
    mutationFn: faucetService.whitelistContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin", "whitelist"] })
      toast.success("Contract whitelisted")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to whitelist contract")
    },
  })

  const removeFromWhitelistMutation = useMutation({
    mutationFn: ({ chainId, address }: { chainId: number; address: string }) => {
      return faucetService.removeFromWhitelist(chainId, address)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin", "whitelist"] })
      toast.success("Contract removed from whitelist")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove from whitelist")
    },
  })

  return {
    contracts: contractsQuery.data,
    isLoading: contractsQuery.isLoading,
    error: contractsQuery.error,
    refetch: contractsQuery.refetch,
    whitelistContract: whitelistContractMutation.mutate,
    removeFromWhitelist: removeFromWhitelistMutation.mutate,
    isUpdating: whitelistContractMutation.isPending || removeFromWhitelistMutation.isPending,
  }
}

/**
 * Manage blocked addresses
 */
export const useBlockedAddresses = () => {
  const queryClient = useQueryClient()

  const addressesQuery = useQuery({
    queryKey: ["faucet", "admin", "blocked"],
    queryFn: async () => {
      return faucetService.getBlockedAddresses()
    },
    staleTime: 60000, // 1 minute
  })

  const blockAddressMutation = useMutation({
    mutationFn: (params: {
      address: string
      reason: string
      chainId?: number | undefined
      expiresAt?: string | undefined
    }) =>
      faucetService.blockAddress(params.address, params.reason, params.chainId, params.expiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin", "blocked"] })
      toast.success("Address blocked")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to block address")
    },
  })

  const unblockAddressMutation = useMutation({
    mutationFn: ({ address, chainId }: { address: string; chainId?: number }) => {
      return faucetService.unblockAddress(address, chainId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin", "blocked"] })
      toast.success("Address unblocked")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to unblock address")
    },
  })

  return {
    addresses: addressesQuery.data,
    isLoading: addressesQuery.isLoading,
    error: addressesQuery.error,
    refetch: addressesQuery.refetch,
    blockAddress: blockAddressMutation.mutate,
    unblockAddress: unblockAddressMutation.mutate,
    isUpdating: blockAddressMutation.isPending || unblockAddressMutation.isPending,
  }
}

/**
 * Emergency controls for faucet
 */
export const useFaucetEmergency = () => {
  const queryClient = useQueryClient()

  const emergencyStopMutation = useMutation({
    mutationFn: faucetService.emergencyStop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin"] })
      toast.success("Emergency stop activated")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to activate emergency stop")
    },
  })

  const resumeOperationsMutation = useMutation({
    mutationFn: faucetService.resumeOperations,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin"] })
      toast.success("Operations resumed")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to resume operations")
    },
  })

  const expireRequestsMutation = useMutation({
    mutationFn: faucetService.expireOldRequests,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin"] })
      toast.success(`Expired ${data.count} requests`)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to expire requests")
    },
  })

  return {
    emergencyStop: emergencyStopMutation.mutate,
    resumeOperations: resumeOperationsMutation.mutate,
    expireRequests: expireRequestsMutation.mutate,
    isLoading:
      emergencyStopMutation.isPending ||
      resumeOperationsMutation.isPending ||
      expireRequestsMutation.isPending,
  }
}

/**
 * Manage chains configuration
 */
export const useChains = () => {
  const queryClient = useQueryClient()

  const chainsQuery = useQuery({
    queryKey: ["faucet", "admin", "chains"],
    queryFn: async () => {
      return faucetService.getAllChains()
    },
    staleTime: 60000, // 1 minute
  })

  const createChainMutation = useMutation({
    mutationFn: faucetService.createChain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin", "chains"] })
      toast.success("Chain created successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create chain")
    },
  })

  const updateChainMutation = useMutation({
    mutationFn: ({ chainId, updates }: { chainId: number; updates: any }) => {
      return faucetService.updateChain(chainId, updates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin", "chains"] })
      toast.success("Chain updated successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update chain")
    },
  })

  const deleteChainMutation = useMutation({
    mutationFn: faucetService.deleteChain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin", "chains"] })
      queryClient.invalidateQueries({ queryKey: ["faucet", "admin", "config"] })
      toast.success("Chain deleted successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete chain")
    },
  })

  return {
    chains: chainsQuery.data?.chains || [],
    total: chainsQuery.data?.chains.length || 0,
    isLoading: chainsQuery.isLoading,
    error: chainsQuery.error,
    refetch: chainsQuery.refetch,
    createChain: createChainMutation.mutate,
    updateChain: updateChainMutation.mutate,
    deleteChain: deleteChainMutation.mutate,
    isUpdating:
      createChainMutation.isPending ||
      updateChainMutation.isPending ||
      deleteChainMutation.isPending,
  }
}

/**
 * Get pending requests
 */
export const useRequests = ({
  page = 1,
  limit = 10,
  offset = 0,
  status,
  chainId,
}: {
  page?: number
  limit?: number
  offset?: number
  status?: "PENDING" | "FAILED" | "CLAIMED" | "EXPIRED"
  chainId?: number
}) => {
  return useQuery({
    queryKey: ["faucet", "admin", "requests", page, limit, offset, status, chainId],
    queryFn: async () => {
      return faucetService.getRequests({
        page,
        limit,
        offset,
        status,
        chainId,
      })
    },
    staleTime: 60000 * 5, // 30 seconds
    refetchInterval: 60000 * 5, // Refetch every 30 seconds
  })
}
