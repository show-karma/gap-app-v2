import { GAP } from "@show-karma/karma-gap-sdk";
import {
  GapIndexerClient,
  IpfsStorage,
} from "@show-karma/karma-gap-sdk/core/class";
import { envVars } from "../enviromentVars";

const ipfsClient = new IpfsStorage(
  {
    token: "",
  },
  {
    url: envVars.NEXT_PUBLIC_IPFS_SPONSOR_URL || "",
    responseParser: (res) => res.cid,
  }
);

/**
 * Returns a GAP client
 * @param network
 * @param useGasless
 * @returns
 */
export const getGapClient = (useGasless = false) => {
  const apiUrl = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
  const cli = new GAP({
    network:
      envVars.NEXT_PUBLIC_ENV === "prod" ? "optimism" : "optimism-goerli",
    // uncomment to use the API client
    ...(apiUrl
      ? {
          apiClient: new GapIndexerClient(apiUrl),
        }
      : {}),

    gelatoOpts: {
      env_gelatoApiKey: "NEXT_GELATO_API_KEY",
      sponsorUrl: envVars.NEXT_PUBLIC_SPONSOR_URL || "/api/sponsored-txn",
      useGasless,
    },
    remoteStorage: ipfsClient,
  });
  GAP.useGasLess = useGasless;
  return cli;
};
