"use client";
import { useENS } from "@/store/ens";
import { blo } from "blo";
import { add } from "date-fns";
import React, { useEffect } from "react";
import { cn } from "@/utilities/tailwind";

interface Props {
  address: any;
  className?: string;
}

const EthereumAddressToENSAvatar: React.FC<Props> = ({
  address,
  className,
}) => {
  const ensAvatars = useENS((state) => state.ensData);
  const populateEnsAvatars = useENS((state) => state.populateEnsAvatars);

  useEffect(() => {
    populateEnsAvatars([address]);
  }, [address, populateEnsAvatars]);

  return (
    <div>
      <img
        src={
          !ensAvatars[address]?.avatar
            ? blo(address)
            : (ensAvatars[address].avatar as string)
        }
        className={cn(
          "h-6 w-6 items-center rounded-full border-1 border-gray-100 dark:border-zinc-900",
          className
        )}
        alt="Recipient's Profile Picture"
      />
    </div>
  );
};

export default EthereumAddressToENSAvatar;
