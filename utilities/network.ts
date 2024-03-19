import type { Chain } from "viem/chains";
import { arbitrum, optimism, optimismSepolia, sepolia } from "viem/chains";
import type { TNetwork } from "@show-karma/karma-gap-sdk";

export const appNetwork: [Chain, ...Chain[]] =
  process.env.NEXT_PUBLIC_ENV === "production"
    ? [optimism, arbitrum]
    : [optimismSepolia];

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
    case 42161:
      return "arbitrum";
    case 11155420:
      return "optimism-sepolia";
    default: {
      const network = appNetwork[0].name;
      return getChainNameById(getChainIdByName(network));
    }
  }
}
