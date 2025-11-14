import { useState } from "react";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";

export interface DeployerInfo {
  deployerAddress: string;
  createdAt: string;
  txHash: string;
}

export interface DeployerLookupState {
  data: DeployerInfo | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to lookup the deployer address of a smart contract
 */
export const useDeployerLookup = () => {
  const [state, setState] = useState<DeployerLookupState>({
    data: null,
    loading: false,
    error: null,
  });

  const lookupDeployer = async (
    network: string,
    contractAddress: string
  ): Promise<DeployerInfo | null> => {
    setState({ data: null, loading: true, error: null });

    try {
      const url = INDEXER.PROJECT.CONTRACTS.DEPLOYER(network, contractAddress);
      const [response, error] = await fetchData(url);

      if (error || !response) {
        // Provide more specific error messages
        if (error && error.includes("not found")) {
          throw new Error(
            `Contract not found on ${network}. Please verify the contract address and network are correct.`
          );
        }
        if (error && error.includes("unsupported")) {
          throw new Error(
            `Network ${network} is not currently supported for deployer lookup. Please contact support.`
          );
        }
        if (error && error.includes("rate limit")) {
          throw new Error(
            "Too many requests. Please wait a moment and try again."
          );
        }
        throw new Error(
          error || "Failed to lookup contract deployer. Please try again."
        );
      }

      const deployerInfo: DeployerInfo = {
        deployerAddress: response.deployerAddress,
        createdAt: response.createdAt,
        txHash: response.txHash,
      };

      setState({ data: deployerInfo, loading: false, error: null });
      return deployerInfo;
    } catch (error: any) {
      const errorMessage =
        error?.message || error || "An error occurred while looking up the deployer";

      setState({ data: null, loading: false, error: errorMessage });
      return null;
    }
  };

  return {
    ...state,
    lookupDeployer,
  };
};
