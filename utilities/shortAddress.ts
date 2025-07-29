export const shortAddress = (address: string) => {
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-6)}`;
  return shortAddress;
};
