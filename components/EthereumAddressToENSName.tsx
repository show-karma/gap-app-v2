"use client";
import type React from "react";
import { useEffect } from "react";
import { useENS } from "@/store/ens";

interface Props {
  address: any;
  shouldTruncate?: boolean;
}

const EthereumAddressToENSName: React.FC<Props> = ({ address, shouldTruncate = true }) => {
  const ensNames = useENS((state) => state.ensData);
  const populateEns = useENS((state) => state.populateEns);
  const lowerCasedAddress = address?.toLowerCase();

  useEffect(() => {
    if (lowerCasedAddress && !ensNames[lowerCasedAddress]) {
      populateEns([lowerCasedAddress]);
    }
  }, [lowerCasedAddress, ensNames, populateEns]);

  const addressToDisplay = shouldTruncate
    ? `${lowerCasedAddress?.slice(0, 6)}...${lowerCasedAddress?.slice(-6)}`
    : lowerCasedAddress;

  return (
    <span className="font-body">
      {!lowerCasedAddress || !ensNames[lowerCasedAddress]?.name
        ? addressToDisplay
        : ensNames[lowerCasedAddress].name}
    </span>
  );
};

export default EthereumAddressToENSName;
