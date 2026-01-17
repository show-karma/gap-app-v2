"use client";
import { blo } from "blo";
import Image from "next/image";
import type React from "react";
import { useEffect, useMemo } from "react";
import { useENS } from "@/store/ens";
import { cn } from "@/utilities/tailwind";

interface Props {
  address?: string | `0x${string}`;
  className?: string;
}

/**
 * Check if URL is an external ENS avatar service that doesn't support HEAD requests.
 * These services (like euc.li) return 503 for HEAD requests, causing unnecessary
 * network overhead. For these URLs, we skip Next.js Image optimization.
 */
const isExternalEnsAvatar = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname;
    // ENS avatar services that don't properly support HEAD requests
    return hostname === "euc.li" || hostname.endsWith(".euc.li");
  } catch {
    return false;
  }
};

const EthereumAddressToENSAvatar: React.FC<Props> = ({ address, className }) => {
  const ensAvatars = useENS((state) => state.ensData);
  const populateEns = useENS((state) => state.populateEns);
  const lowerCasedAddress = address ? address?.toLowerCase() : undefined;

  useEffect(() => {
    if (
      address?.startsWith("0x") &&
      lowerCasedAddress &&
      !ensAvatars[lowerCasedAddress as `0x${string}`]
    ) {
      populateEns([lowerCasedAddress]);
    }
  }, [address, lowerCasedAddress, ensAvatars, populateEns]);

  const avatar = ensAvatars[lowerCasedAddress as `0x${string}`]?.avatar;

  // Determine if we should skip Next.js Image optimization for this avatar
  // to avoid unnecessary HEAD requests to services that don't support them
  const shouldSkipOptimization = useMemo(() => {
    return avatar ? isExternalEnsAvatar(avatar) : false;
  }, [avatar]);

  if (!address || !address.startsWith("0x")) return null;

  const imageSrc = !avatar ? blo(lowerCasedAddress as `0x${string}`) : avatar;

  return (
    <div>
      <Image
        src={imageSrc}
        alt="Recipient profile"
        width={24}
        height={24}
        unoptimized={shouldSkipOptimization}
        className={cn(
          "h-6 w-6 min-h-6 min-w-6 items-center rounded-full border-1 border-gray-100 dark:border-zinc-900",
          className
        )}
      />
    </div>
  );
};

export default EthereumAddressToENSAvatar;
