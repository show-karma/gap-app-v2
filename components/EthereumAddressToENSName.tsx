import React, { useEffect } from "react";
import { useEnsName } from "wagmi";

interface Props {
  address: any;
  shouldTruncate?: boolean;
}

const EthereumAddressToENSName: React.FC<Props> = ({
  address,
  shouldTruncate = true,
}) => {
  const { data: ensName, isLoading } = useEnsName({
    address: address,
    cacheTime: 50000,
  });

  useEffect(() => {
    if (!isLoading) {
      console.log(ensName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const addressToDisplay = shouldTruncate
    ? address?.slice(0, 6) + "..." + address?.slice(-6)
    : address;

  return <span>{!ensName ? addressToDisplay : "@" + ensName}</span>;
};

export default EthereumAddressToENSName;
