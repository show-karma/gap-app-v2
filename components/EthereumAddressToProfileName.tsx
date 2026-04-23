"use client";

import { blo } from "blo";
import Image from "next/image";
import type React from "react";
import { useEffect, useMemo } from "react";
import { useContributorProfile } from "@/hooks/useContributorProfile";
import { useENS } from "@/store/ens";
import { useUserProfiles } from "@/store/userProfiles";
import { isProblematicEnsAvatar } from "@/utilities/isProblematicEnsAvatar";
import { cn } from "@/utilities/tailwind";

interface Props {
  address: string | undefined;
  shouldTruncate?: boolean;
  showProfilePicture?: boolean;
  className?: string;
  pictureClassName?: string;
}

/**
 * Displays a human-readable name for an Ethereum address.
 *
 * Fallback chain (highest priority first):
 * 1. ContributorProfile.name (on-chain attestation)
 * 2. Privy name (from public user profiles endpoint)
 * 3. Privy email (from same endpoint, only when name absent)
 * 4. ENS name
 * 5. Truncated address (0xabcd...1234)
 *
 * When showProfilePicture is true, renders a 24×24 avatar to the left.
 * Avatar fallback: Privy picture → ENS avatar → Blockie
 */
const EthereumAddressToProfileName: React.FC<Props> = ({
  address,
  shouldTruncate = true,
  showProfilePicture = false,
  className,
  pictureClassName,
}) => {
  const ensData = useENS((state) => state.ensData);
  const populateEns = useENS((state) => state.populateEns);
  const profiles = useUserProfiles((state) => state.profiles);
  const populateProfiles = useUserProfiles((state) => state.populateProfiles);

  const lowerCasedAddress = address?.toLowerCase();

  const { profile: contributorProfile } = useContributorProfile(lowerCasedAddress);

  useEffect(() => {
    if (!lowerCasedAddress) return;

    if (!ensData[lowerCasedAddress as `0x${string}`]) {
      populateEns([lowerCasedAddress]);
    }

    const profileEntry = profiles[lowerCasedAddress];
    if (!profileEntry || (!profileEntry.isTried && !profileEntry.isFetching)) {
      populateProfiles([lowerCasedAddress]);
    }
  }, [lowerCasedAddress, ensData, populateEns, profiles, populateProfiles]);

  // If address is not a valid 0x string, render raw input as-is
  const isValidAddress = !!lowerCasedAddress?.startsWith("0x");

  const truncatedAddress = lowerCasedAddress
    ? `${lowerCasedAddress.slice(0, 6)}...${lowerCasedAddress.slice(-6)}`
    : "";

  const addressToDisplay = shouldTruncate ? truncatedAddress : (lowerCasedAddress ?? "");

  const privyProfile = lowerCasedAddress ? profiles[lowerCasedAddress] : undefined;
  const ensEntry = lowerCasedAddress ? ensData[lowerCasedAddress as `0x${string}`] : undefined;

  // Compute display name: contributor → privy.name → privy.email → ens.name → truncated address
  const displayName = useMemo(() => {
    if (!isValidAddress) return address ?? "";

    if (contributorProfile?.name) return contributorProfile.name;

    if (privyProfile?.isTried && privyProfile.name) return privyProfile.name;

    if (privyProfile?.isTried && privyProfile.email) return privyProfile.email;

    if (ensEntry?.name) return ensEntry.name;

    return addressToDisplay;
  }, [isValidAddress, address, contributorProfile, privyProfile, ensEntry, addressToDisplay]);

  // Compute avatar when showProfilePicture is true
  const avatarSrc = useMemo(() => {
    if (!showProfilePicture || !lowerCasedAddress) return null;

    if (privyProfile?.picture && !isProblematicEnsAvatar(privyProfile.picture)) {
      return privyProfile.picture;
    }

    const ensAvatar = ensEntry?.avatar;
    if (ensAvatar && !isProblematicEnsAvatar(ensAvatar)) {
      return ensAvatar;
    }

    // Fall back to blockie only when address starts with 0x
    if (isValidAddress) {
      return blo(lowerCasedAddress as `0x${string}`);
    }

    return null;
  }, [showProfilePicture, lowerCasedAddress, privyProfile, ensEntry, isValidAddress]);

  const nameSpan = <span className={cn("font-body", className)}>{displayName}</span>;

  if (!showProfilePicture || !avatarSrc) {
    return nameSpan;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src={avatarSrc}
        alt={`${displayName} avatar`}
        width={24}
        height={24}
        className={cn(
          "h-6 w-6 min-h-6 min-w-6 rounded-full border border-gray-100 dark:border-zinc-900",
          pictureClassName
        )}
      />
      {nameSpan}
    </span>
  );
};

export default EthereumAddressToProfileName;
