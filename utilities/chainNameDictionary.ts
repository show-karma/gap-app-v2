export const chainNameDictionary = (chainId: number) => {
  switch (chainId) {
    case 10:
      return "Optimism";
    case 42161:
      return "Arbitrum One";
    case 420:
      return "Optimism";
    case 11155420:
      return "Optimism";
    default:
      return "";
  }
};
