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
  const ensNames = useENS((state) => state.ensData);
  const populateEns = useENS((state) => state.populateEns);
  const lowerCasedAddress = address.toLowerCase();

  useEffect(() => {
    if (!ensNames[lowerCasedAddress]) {
      populateEns([lowerCasedAddress]);
    }
  }, [lowerCasedAddress, ensNames, populateEns]);

  const addressToDisplay = shouldTruncate
    ? lowerCasedAddress?.slice(0, 6) + "..." + lowerCasedAddress?.slice(-6)
    : lowerCasedAddress;

  return (
    <span className="font-body">
      {!ensNames[lowerCasedAddress.toLowerCase()]?.name
        ? addressToDisplay
        : ensNames[lowerCasedAddress.toLowerCase()].name}
    </span>
  );
};

export default EthereumAddressToENSName;
