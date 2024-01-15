import React from "react";

interface Props {
  address: string;
}

const ShortenAddress: React.FC<Props> = ({ address }) => {
  const shortenedAddress = `${address.slice(0, 6)}...${address.slice(-6)}`;
  return shortenedAddress;
};

export default ShortenAddress;
