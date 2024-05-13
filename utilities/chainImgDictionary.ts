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
    case 44787:
      return "/images/networks/celo.svg";
    case 84532:
      return "/images/networks/base.svg";
    case 8453:
      return "/images/networks/base.svg";
    default:
      return "";
  }
};
