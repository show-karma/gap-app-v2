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
 * List of problematic ENS avatar domains that should be blocked.
 * These domains are known to cause issues such as:
 * - 503 Service Unavailable errors
 * - Slow response times that degrade UX
 * - Unreliable uptime affecting avatar loading
 *
 * Add domains to this list as they are identified as problematic.
 * Format: domain strings that will be matched against the URL hostname.
 */
const PROBLEMATIC_ENS_AVATAR_DOMAINS = [
  // euc.li - ENS avatar service that frequently returns 503 errors
  // and causes cascading failures in avatar loading
  "euc.li",
] as const;

/**
 * Checks if an ENS avatar URL is from a known problematic external service.
 * These services may cause 503 errors or other reliability issues that
 * degrade user experience and can cascade into application errors.
 *
 * @param url - The avatar URL to validate
 * @returns true if the URL is from a problematic domain, false otherwise
 */
function isProblematicEnsAvatar(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    const isProblematic = PROBLEMATIC_ENS_AVATAR_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (isProblematic && process.env.NODE_ENV === "development") {
      console.warn(
        `[EthereumAddressToENSAvatar] Blocked problematic ENS avatar URL: ${url}. ` +
          `Domain "${hostname}" is known to cause 503 errors. Falling back to blockie avatar.`
      );
    }

    return isProblematic;
  } catch (error) {
    // Invalid URL - log in development and treat as problematic to be safe
    if (process.env.NODE_ENV === "development") {
      console.error(`[EthereumAddressToENSAvatar] Failed to parse avatar URL: ${url}`, error);
    }
    return true;
  }
}

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

  // Get the avatar URL and validate it's not from a problematic domain
  const rawAvatar = ensAvatars[lowerCasedAddress as `0x${string}`]?.avatar;
  const avatar = useMemo(() => {
    if (!rawAvatar) return null;
    if (isProblematicEnsAvatar(rawAvatar)) return null;
    return rawAvatar;
  }, [rawAvatar]);

  if (!address || !address.startsWith("0x")) return null;

  return (
    <div>
      <Image
        src={avatar ?? blo(lowerCasedAddress as `0x${string}`)}
        alt="Recipient profile"
        width={24}
        height={24}
        className={cn(
          "h-6 w-6 min-h-6 min-w-6 items-center rounded-full border-1 border-gray-100 dark:border-zinc-900",
          className
        )}
      />
    </div>
  );
};

export default EthereumAddressToENSAvatar;
