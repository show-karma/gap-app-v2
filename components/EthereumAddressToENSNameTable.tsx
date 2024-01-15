import BlockiesSvg from "blockies-react-svg";
import Link from "next/link";
import React from "react";
import { useEnsName } from "wagmi";

interface Props {
  address: any;
}

const EthereumAddressToENSName: React.FC<Props> = ({ address }) => {
  const { data: ensName } = useEnsName({
    address: address,
    cacheTime: 50000,
  });

  return (
    <Link href={`/player/${!ensName ? address : ensName}`}>
      <div className="flex items-center">
        <BlockiesSvg
          address={address}
          size={8}
          scale={10}
          caseSensitive={false}
          className="h-12 w-12 rounded-md ring-4 ring-gray-200 dark:ring-black border-1 border-gray-100 dark:border-zinc-900 sm:h-8 sm:w-8"
        />
        <div className="ml-4">
          <div className="font-semibold text-gray-900 dark:text-white">
            {!ensName
              ? address?.slice(0, 6) + "..." + address?.slice(-6)
              : "@" + ensName}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EthereumAddressToENSName;
