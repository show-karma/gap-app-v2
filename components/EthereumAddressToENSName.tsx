"use client";
import { useENS } from "@/store/ens";
import React, { useEffect, useMemo } from "react";

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
  const populateEns = useENS((state) => state.populateEns);

  useEffect(() => {
    if (!ensNames[address.toLowerCase()]) {
      populateEns([address]);
    }
  }, [address, ensNames]);

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
