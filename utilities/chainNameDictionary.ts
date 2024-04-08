export const chainNameDictionary = (chainId: number) => {
  switch (chainId) {
    case 10:
      return "Optimism";
    case 42161:
      return "Arbitrum One";
    case 420:
      return "Optimism Goerli";
    case 11155420:
      return "Optimism Sepolia";
    case 11155111:
      return "Sepolia";
    default:
      return "";
  }
};
