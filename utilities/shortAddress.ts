export const shortAddress = (address: string | undefined | null) => {
  if (!address) return "";
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-6)}`;
  return shortAddress;
};
