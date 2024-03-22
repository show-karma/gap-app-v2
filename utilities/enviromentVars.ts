const isDev = process.env.NEXT_PUBLIC_ENV === "staging";
// const baseDevUrl = "https://gapstagapi.karmahq.xyz";
const baseDevUrl = "http://127.0.0.1:3002";

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
  RPC: {
    OPTIMISM: process.env.NEXT_PUBLIC_RPC_OPTIMISM as string,
    ARBITRUM: process.env.NEXT_PUBLIC_RPC_ARBITRUM as string,
    OPT_SEPOLIA: process.env.NEXT_PUBLIC_RPC_OPTIMISM_SEPOLIA as string,
  },
  PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID || "",
};
