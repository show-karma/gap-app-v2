"use client";
import { blo } from "blo";
import Image from "next/image";
import type React from "react";
import { useEffect } from "react";
import { useENS } from "@/store/ens";
import { cn } from "@/utilities/tailwind";

interface Props {
  address?: string | `0x${string}`;
  className?: string;
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

  if (!address || !address.startsWith("0x")) return null;

  const avatar = ensAvatars[lowerCasedAddress as `0x${string}`]?.avatar;

  return (
    <div>
      <Image
        src={!avatar ? blo(lowerCasedAddress as `0x${string}`) : avatar}
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
