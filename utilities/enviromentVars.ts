const isDev = process.env.NEXT_PUBLIC_ENV === "staging";

// const baseDevUrl = "http://127.0.0.1:3002";
// const baseDevUrl = "https://c6f2-2401-4900-1f2b-f73f-21c6-9609-dfd9-61f6.ngrok-free.app";
const baseDevUrl = "https://gapstagapi.karmahq.xyz";

export const envVars = {
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  NEXT_PUBLIC_KARMA_API: "https://api.karmahq.xyz/api",
  NEXT_PUBLIC_GAP_INDEXER_URL: isDev
    ? baseDevUrl
    : "https://gapapi.karmahq.xyz",
  NEXT_PUBLIC_IPFS_SPONSOR_URL: isDev
    ? `${baseDevUrl}/ipfs`
    : "https://gapapi.karmahq.xyz/ipfs",
  NEXT_PUBLIC_SPONSOR_URL: isDev
    ? `${baseDevUrl}/attestations/sponsored-txn`
    : "https://gapapi.karmahq.xyz/attestations/sponsored-txn",
  ALCHEMY: {
    OPTIMISM: process.env.NEXT_PUBLIC_ALCHEMY_OPTIMISM,
    ARBITRUM: process.env.NEXT_PUBLIC_ALCHEMY_ARBITRUM,
    SEPOLIA: process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA,
  },
  PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID || "",
  SHOW_CACHED_DATA: process.env.NEXT_PUBLIC_SHOW_CACHED_DATA === "true",
};
