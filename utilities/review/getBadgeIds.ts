import { readContract } from "viem/actions";
import { createPublicClient, http, Hex } from "viem";
import { arbitrum } from "viem/chains";
import { TRUSTFUL_SCORER } from "./constants/constants";

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

/// See {TrustfulScorer-getBadgesIds} in the contract.
/// Returns the badge IDs contained in a scorer.
export async function getBadgeIds(scorerId: number): Promise<Hex[]> {
  const abi = {
    inputs: [
      {
        internalType: "uint256",
        name: "scorerId",
        type: "uint256",
      },
    ],
    name: "getBadgesIds",
    outputs: [
      {
        internalType: "bytes32[]",
        name: "",
        type: "bytes32[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  };

  try {
    const grantStory = await readContract(publicClient, {
      address: TRUSTFUL_SCORER,
      functionName: "getBadgesIds", // TODO rename to getBadgeIds
      abi: [abi],
      args: [scorerId],
    });

    return grantStory as Hex[];
  } catch (error) {
    throw new Error(`Error when reading the contract. ${error}`);
  }
}
