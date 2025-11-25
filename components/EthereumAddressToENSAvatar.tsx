/* eslint-disable @next/next/no-img-element */
"use client"
import { blo } from "blo"
import type React from "react"
import { useEffect } from "react"
import { useENS } from "@/store/ens"
import { cn } from "@/utilities/tailwind"

interface Props {
  address?: string | `0x${string}`
  className?: string
}

const EthereumAddressToENSAvatar: React.FC<Props> = ({ address, className }) => {
  const ensAvatars = useENS((state) => state.ensData)
  const populateEns = useENS((state) => state.populateEns)
  const lowerCasedAddress = address ? address?.toLowerCase() : undefined

  useEffect(() => {
    if (
      address?.startsWith("0x") &&
      lowerCasedAddress &&
      !ensAvatars[lowerCasedAddress as `0x${string}`]
    ) {
      populateEns([lowerCasedAddress])
    }
  }, [address, lowerCasedAddress, ensAvatars, populateEns])

  if (!address || !address.startsWith("0x")) return null

  const avatar = ensAvatars[lowerCasedAddress as `0x${string}`]?.avatar

  return (
    <div>
      <img
        src={!avatar ? blo(lowerCasedAddress as `0x${string}`) : avatar}
        className={cn(
          "h-6 w-6 min-h-6 min-w-6 items-center rounded-full border-1 border-gray-100 dark:border-zinc-900",
          className
        )}
        alt="Recipient profile"
      />
    </div>
  )
}

export default EthereumAddressToENSAvatar
