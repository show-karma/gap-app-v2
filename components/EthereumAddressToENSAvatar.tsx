"use client";
import { useENSAvatar } from "@/store/ensAvatars";
import { blo } from "blo";
import React, { useEffect } from "react";

interface Props {
  address: any;
}

const EthereumAddressToENSAvatar: React.FC<Props> = ({ address }) => {
  const ensAvatars = useENSAvatar((state) => state.ensAvatars);
  const populateEnsAvatars = useENSAvatar((state) => state.populateEnsAvatars);

  useEffect(() => {
    populateEnsAvatars([address]);
  }, [address, populateEnsAvatars]);

  return (
    <span>
      {!ensAvatars[address]?.avatar ? (
        <img
          src={blo(address)}
          className="w-4 h-4  rounded-full border-1 border-gray-100 dark:border-zinc-900"
          alt="Recipient's Profile Picture"
        />
      ) : (
        <img
          src={ensAvatars[address].avatar as string}
          className="w-4 h-4  rounded-full border-1 border-gray-100 dark:border-zinc-900"
          alt="Recipient's Profile Picture"
        />
      )}
    </span>
  );
};

export default EthereumAddressToENSAvatar;
