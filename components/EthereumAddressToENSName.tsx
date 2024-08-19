"use client";
import { useENS } from "@/store/ens";
import React, { useEffect } from "react";

interface Props {
  address: any;
  shouldTruncate?: boolean;
}

const EthereumAddressToENSName: React.FC<Props> = ({
  address,
  shouldTruncate = true,
}) => {
  // const { data: ensName, isLoading } = useEnsName({
  //   address: address,
  //   cacheTime: 50000,
  // });
  const ensNames = useENS((state) => state.ensData);
  const populateEnsNames = useENS((state) => state.populateEnsNames);

  useEffect(() => {
    populateEnsNames([address]);
  }, [address, populateEnsNames]);

  const addressToDisplay = shouldTruncate
    ? address?.slice(0, 6) + "..." + address?.slice(-6)
    : address;

  return (
    <span>
      {!ensNames[address]?.name ? addressToDisplay : ensNames[address].name}
    </span>
  );
};

export default EthereumAddressToENSName;
