"use client";
import { useENS } from "@/store/ens";
import { blo } from "blo";
import { add } from "date-fns";
import React, { useEffect } from "react";

interface Props {
  address: any;
}

const EthereumAddressToENSAvatar: React.FC<Props> = ({ address }) => {
  const ensAvatars = useENS((state) => state.ensData);
  const populateEnsAvatars = useENS((state) => state.populateEnsAvatars);

  useEffect(() => {
    populateEnsAvatars([address]);
  }, [address, populateEnsAvatars]);

  return (
    <span>
      <img
        src={
          !ensAvatars[address]?.avatar
            ? blo(address)
            : (ensAvatars[address].avatar as string)
        }
        className="h-6 w-6 items-center rounded-full border-1 border-gray-100 dark:border-zinc-900"
        alt="Recipient's Profile Picture"
      />
    </span>
  );
};

export default EthereumAddressToENSAvatar;
