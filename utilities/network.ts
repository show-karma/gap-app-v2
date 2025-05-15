import type { Chain } from "viem/chains";
import {
  arbitrum,
  celo,
  optimism,
  optimismSepolia,
  baseSepolia,
  sepolia,
  sei,
  base,
} from "viem/chains";
import type { TNetwork } from "@show-karma/karma-gap-sdk";

const getNetwork = (): [Chain, ...Chain[]] => {
  if (process.env.NEXT_PUBLIC_ENV === "production-miniapp") {
    return [celo];
  }
  if (process.env.NEXT_PUBLIC_ENV === "production") {
    return [optimism, arbitrum, celo, sei];
  }
  return [optimismSepolia, baseSepolia, sepolia];
};

export const appNetwork = getNetwork();

export function getExplorerUrl(chainId: number, transactionHash: string) {
  const chain = [
    optimism,
    arbitrum,
    celo,
    sei,
    optimismSepolia,
    baseSepolia,
    sepolia,
  ].find((c) => c.id === chainId);
  if (!chain || !chain.blockExplorers?.default?.url) {
    // Return a fallback block explorer URL if the chain or its explorer is not found
    return `https://www.oklink.com/multi-search#key=${transactionHash}`;
  }
  return `${chain.blockExplorers.default.url}/tx/${transactionHash}`;
}

export function getChainIdByName(name: string) {
  switch (name.toLowerCase()) {
    case "mainnet":
      return 1;
    case "OP Mainnet":
      return 10;
    case "optimism":
      return 10;
    case "arbitrum":
      return 42161;
    case "arbitrum-one":
      return 42161;
    case "ArbitrumOne":
      return 42161;
    case "sei":
      return 1329;
    case "Seitrace":
      return 1329;
    case "optimismGoerli":
      return 420;
    case "Optimism Goerli":
      return 420;
    case "optimism-goerli":
      return 420;
    case "Optimism Sepolia":
      return 11155420;
    case "optimism-sepolia":
      return 11155420;
    case "optimismSepolia":
      return 11155420;
    case "sepolia":
      return 11155111;
    case "Sepolia":
      return 11155111;
    case "base-sepolia":
      return 84532;
    case "base sepolia":
      return 84532;
    case "basesepolia":
      return 84532;
    case "celo":
      return 42220;
    default:
      return appNetwork[0].id;
  }
}

export function getChainNameById(id: number): TNetwork {
  switch (id) {
    // case 1:
    //   return 'mainnet';
    case 10:
      return "optimism";
    case 1329:
      return "sei";
    case 42161:
      return "arbitrum";
    case 11155420:
      return "optimism-sepolia";
    case 11155111:
      return "sepolia";
    case 84532:
      return "base-sepolia";
    case 42220:
      return "celo";
    default: {
      const network = appNetwork[0].name;
      return getChainNameById(getChainIdByName(network));
    }
  }
}
