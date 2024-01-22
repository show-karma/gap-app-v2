const isDev = process.env.NEXT_PUBLIC_ENV === "staging";

export const envVars = {
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  NEXT_PUBLIC_GAP_INDEXER_URL: isDev
    ? "https://gapstagapi.karmahq.xyz"
    : "https://gapapi.karmahq.xyz",
  NEXT_PUBLIC_IPFS_SPONSOR_URL: isDev
    ? "https://gapstagapi.karmahq.xyz/ipfs"
    : "https://gapapi.karmahq.xyz/ipfs",
  NEXT_PUBLIC_SPONSOR_URL: isDev
    ? "https://gapstagapi.karmahq.xyz/attestations/sponsored-txn"
    : "https://gapapi.karmahq.xyz/attestations/sponsored-txn",
};
