import type { Chain } from "viem/chains";
import { arbitrum, optimism, optimismGoerli, sepolia } from "viem/chains";
import type { TNetwork } from "@show-karma/karma-gap-sdk";

export const appNetwork: [Chain, Chain, ...Chain[]] =
  process.env.NEXT_PUBLIC_ENV === "production"
    ? [optimism, arbitrum]
    : [optimismGoerli, sepolia];

export function getChainIdByName(name: string) {
  switch (name) {
    case "mainnet":
      return 1;
    case "OP Mainnet":
      return 10;
    case "optimism":
      return 10;
    case "arbitrum":
      return 42161;
    case "optimismGoerli":
      return 420;
    case "Optimism Goerli":
      return 420;
    case "optimism-goerli":
      return 420;
    case "sepolia":
      return 11155111;
    default:
      throw new Error(`Unknown chain name: ${name}`);
  }
}

export function getChainNameById(id: number): TNetwork {
  switch (id) {
    // case 1:
    //   return 'mainnet';
    case 10:
      return "optimism";
    case 42161:
      return "arbitrum";
    case 420:
      return "optimism-goerli";
    case 11155111:
      return "sepolia";
    default: {
      const network = appNetwork[0].name;
      return getChainNameById(getChainIdByName(network));
    }
  }
}
