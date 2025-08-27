import { getAPIUrl } from "@/lib/config";

const isDev = process.env.NEXT_PUBLIC_ENV === "staging";

export const envVars = {
  isDev,
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  NEXT_PUBLIC_KARMA_API: "https://api.karmahq.xyz/api",
  NEXT_PUBLIC_GAP_INDEXER_URL: getAPIUrl(),
  NEXT_PUBLIC_IPFS_SPONSOR_URL: isDev
    ? `${getAPIUrl()}/ipfs`
    : "https://gapapi.karmahq.xyz/ipfs",
  NEXT_PUBLIC_SPONSOR_URL: isDev
    ? `${getAPIUrl()}/attestations/sponsored-txn`
    : "https://gapapi.karmahq.xyz/attestations/sponsored-txn",
  RPC: {
    OPTIMISM: process.env.NEXT_PUBLIC_RPC_OPTIMISM as string,
    ARBITRUM: process.env.NEXT_PUBLIC_RPC_ARBITRUM as string,
    OPT_SEPOLIA: process.env.NEXT_PUBLIC_RPC_OPTIMISM_SEPOLIA as string,
    BASE_SEPOLIA: process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA as string,
    CELO: process.env.NEXT_PUBLIC_RPC_CELO as string,
    SEPOLIA: process.env.NEXT_PUBLIC_RPC_SEPOLIA as string,
    SEI: process.env.NEXT_PUBLIC_RPC_SEI as string,
    LISK: process.env.NEXT_PUBLIC_RPC_LISK as string,
    SCROLL: process.env.NEXT_PUBLIC_RPC_SCROLL as string,
  },
  PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID || "",
  IPFS_TOKEN: process.env.NEXT_PUBLIC_IPFS_TOKEN || "",
  ANON_KARMA_URL: "https://anon.karmahq.xyz",
  PROFILE_ID: isDev
    ? "0x418102f570483423fc7d431e0efd1cc5d49f2b3fe4c85cb7d837bcfa83e7db03"
    : "0xf123b01fbc8e244131dd1078c8c6778a7037855139f01e65e0e424e06584edd2",
  VERCEL_URL:
    process.env.NEXT_PUBLIC_ENV === "production"
      ? `https://gap.karmahq.xyz`
      : "https://gapstag.karmahq.xyz",
  OSO_API_KEY: process.env.NEXT_PUBLIC_OSO_API_KEY || "",
};
