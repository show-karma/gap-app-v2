"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAccount } from "wagmi"
import { Spinner } from "@/components/Utilities/Spinner"
import { useFaucetAdmin } from "@/hooks/useFaucetAdmin"
import { PAGES } from "@/utilities/pages"

export default function FaucetAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { isAdmin, isLoading } = useFaucetAdmin()
  useEffect(() => {
    // Redirect if not connected or not admin
    if (!isConnected) {
      router.push(PAGES.HOME)
      return
    }

    if (!isLoading && !isAdmin) {
      router.push(PAGES.HOME)
    }
  }, [isConnected, isAdmin, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You do not have permission to access the faucet admin panel.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
