"use client";
import { useENSAvatar } from "@/store/ensAvatars";
import { blo } from "blo";
import { add } from "date-fns";
import React, { useEffect } from "react";

interface Props {
  address: any;
}

const EthereumAddressToENSAvatar: React.FC<Props> = ({ address }) => {
  const ensAvatars = useENSAvatar((state) => state.ensAvatars);
  const populateEnsAvatars = useENSAvatar((state) => state.populateEnsAvatars);

  useEffect(() => {
    populateEnsAvatars([address]);
    console.log(ensAvatars[address]?.avatar);
  }, [address, populateEnsAvatars]);

  return (
    <span>
      <img
        src={
          !ensAvatars[address]?.avatar
            ? blo(address)
            : (ensAvatars[address].avatar as string)
        }
        className="w-10 h-10  rounded-full border-1 border-gray-100 dark:border-zinc-900"
        alt="Recipient's Profile Picture"
      />
    </span>
  );
};

export default EthereumAddressToENSAvatar;
