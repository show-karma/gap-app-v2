const isDev = process.env.NEXT_PUBLIC_ENV === "staging";
const baseDevUrl = "https://gapstagapi.karmahq.xyz";
// const baseDevUrl = "https://ef32-128-201-0-2.ngrok-free.app";

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
};
