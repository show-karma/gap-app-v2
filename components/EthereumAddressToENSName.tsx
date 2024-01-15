import React, { useEffect } from "react";
import { useEnsName } from "wagmi";

interface Props {
  address: any;
}

const EthereumAddressToENSName: React.FC<Props> = ({ address }) => {
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

  return (
    <span>
      {!ensName
        ? address?.slice(0, 6) + "..." + address?.slice(-6)
        : "@" + ensName}
    </span>
  );
};

export default EthereumAddressToENSName;
