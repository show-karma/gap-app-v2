import type { Chain } from "viem/chains";
import {
  arbitrum,
  celo,
  optimism,
  optimismSepolia,
  baseSepolia,
  sepolia,
  sei,
  lisk,
  scroll,
  mainnet,
  base,
  polygon,
} from "viem/chains";
import type { TNetwork } from "@show-karma/karma-gap-sdk";

const includeTestNetworks = process.env.NEXT_PUBLIC_ENV !== "production";

const productionNetworks: Chain[] = [
  mainnet,
  optimism,
  arbitrum,
  base,
  celo,
  polygon,
  sei,
  lisk,
  scroll,
];

const nonProductionNetworks: Chain[] = [
  mainnet,
  optimism,
  arbitrum,
  base,
  celo,
  polygon,
  optimismSepolia,
  baseSepolia,
  sepolia,
];

const configuredNetworks = includeTestNetworks
  ? nonProductionNetworks
  : productionNetworks;

export const appNetwork = configuredNetworks as [Chain, ...Chain[]];

export function getExplorerUrl(chainId: number, transactionHash: string) {
  const chain = [
    mainnet,
    optimism,
    arbitrum,
    base,
    celo,
    polygon,
    sei,
    optimismSepolia,
    baseSepolia,
    sepolia,
    lisk,
    scroll,
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
    case "ethereum":
      return 1;
    case "OP Mainnet":
    case "optimism":
      return 10;
    case "arbitrum":
    case "arbitrum-one":
    case "ArbitrumOne":
      return 42161;
    case "base":
      return 8453;
    case "celo":
      return 42220;
    case "polygon":
    case "matic":
      return 137;
    case "sei":
    case "Seitrace":
      return 1329;
    case "optimismGoerli":
    case "Optimism Goerli":
    case "optimism-goerli":
      return 420;
    case "Optimism Sepolia":
    case "optimism-sepolia":
    case "optimismSepolia":
      return 11155420;
    case "sepolia":
    case "Sepolia":
      return 11155111;
    case "base-sepolia":
    case "base sepolia":
    case "basesepolia":
      return 84532;
    case "lisk":
      return 1135;
    case "scroll":
      return 534352;
    default:
      return appNetwork[0].id;
  }
}

export function getChainNameById(id: number): TNetwork {
  switch (id) {
    case 1:
      return "mainnet" as TNetwork;
    case 10:
      return "optimism";
    case 42161:
      return "arbitrum";
    case 8453:
      return "base" as TNetwork;
    case 42220:
      return "celo";
    case 137:
      return "polygon" as TNetwork;
    case 1329:
      return "sei";
    case 11155420:
      return "optimism-sepolia";
    case 11155111:
      return "sepolia";
    case 84532:
      return "base-sepolia";
    case 1135:
      return "lisk";
    case 534352:
      return "scroll";
    default: {
      const network = appNetwork[0].name;
      return getChainNameById(getChainIdByName(network));
    }
  }
}
