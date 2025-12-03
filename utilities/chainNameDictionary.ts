export const chainNameDictionary = (chainId: number) => {
  switch (chainId) {
    case 1:
      return "Ethereum";
    case 10:
      return "Optimism";
    case 1135:
      return "Lisk";
    case 1329:
      return "Sei";
    case 1328:
      return "Sei Testnet";
    case 713715:
      return "Sei Devnet";
    case 42161:
      return "Arbitrum One";
    case 420:
      return "Optimism Goerli";
    case 11155420:
      return "Optimism Sepolia";
    case 11155111:
      return "Sepolia";
    case 42220:
      return "CELO";
    case 44787:
      return "CELO Alfajores";
    case 84532:
      return "Base Sepolia";
    case 8453:
      return "Base";
    case 534352:
      return "Scroll";
    default:
      return "";
  }
};
