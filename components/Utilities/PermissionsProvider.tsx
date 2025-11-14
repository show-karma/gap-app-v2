"use client"

import { useEffect } from "react"
import { useAccount } from "wagmi"
import { useAdminCommunities } from "@/hooks/useAdminCommunities"
import { useAuth } from "@/hooks/useAuth"
import { useContractOwner } from "@/hooks/useContractOwner"
import { useRegistryStore } from "@/store/registry"
import { isMemberOfProfile } from "@/utilities/allo/isMemberOf"
import { checkIsPoolManager } from "@/utilities/registry/checkIsPoolManager"
import { errorManager } from "./errorManager"

export function PermissionsProvider() {
  const { address, isConnected } = useAuth()
  const { chain } = useAccount()
  useAdminCommunities(address)
  useContractOwner()

  const { setIsRegistryAdmin, setIsPoolManager } = useRegistryStore()
  useEffect(() => {
    if (!address || !isConnected) {
      setIsRegistryAdmin(false)
      return
    }
    const getMemberOf = async () => {
      try {
        const call = await isMemberOfProfile(address)
        setIsRegistryAdmin(call)
        if (!call) {
          const isManager = await checkIsPoolManager(address)
          setIsPoolManager(isManager)
        }
      } catch (error: any) {
        errorManager(
          `Error while checking if ${address} is a registry admin or pool manager`,
          error
        )
        console.log(error)
      }
    }
    getMemberOf()
  }, [address, isConnected, chain])

  return null
}
