export const chainImgDictionary = (chainId: number) => {
  switch (chainId) {
    case 1:
      return "/images/networks/ethereum.svg";
    case 10:
      return "/images/networks/optimism.svg";
    case 42161:
      return "/images/networks/arbitrum-one.svg";
    case 420:
      return "/images/networks/optimism.svg";
    case 11155111:
      return "/images/networks/ethereum.svg";
    case 11155420:
      return "/images/networks/optimism.svg";
    default:
      return "";
  }
};
