const isDev = process.env.NEXT_PUBLIC_ENV === "staging";

export const envVar = {
  NEXT_PUBLIC_GAP_INDEXER_URL: isDev
    ? "https://gapapi.karmahq.xyz"
    : "https://gapstagapi.karmahq.xyz",
  NEXT_PUBLIC_IPFS_SPONSOR_URL: isDev
    ? "https://gapapi.karmahq.xyz/ipfs"
    : "https://gapstagapi.karmahq.xyz/ipfs",
  NEXT_PUBLIC_SPONSOR_URL: isDev
    ? "https://gapapi.karmahq.xyz/attestations/sponsored-txn"
    : "https://gapstagapi.karmahq.xyz/attestations/sponsored-txn",
};
