import { createPublicClient, http, Hex } from "viem";
import { readContract } from "viem/actions";
import { arbitrum } from "viem/chains";

import { TRUSTFUL_SCORER } from "./constants/constants";

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

/// See {TrustfulScorer-getBadgeIds} in the contract.
/// Returns the badge IDs contained in a scorer.
export async function getBadgeIds(scorerId: number): Promise<Hex[] | null> {
  const abi = [
    {
      inputs: [{ internalType: "uint256", name: "scorerId", type: "uint256" }],
      name: "getBadgeIds",
      outputs: [{ internalType: "bytes32[]", name: "", type: "bytes32[]" }],
      stateMutability: "view",
      type: "function",
    },
  ];

  try {
    const badgeIds = await readContract(publicClient, {
      address: TRUSTFUL_SCORER,
      functionName: "getBadgeIds",
      abi: abi,
      args: [scorerId],
    });

    return badgeIds as Hex[];
  } catch (error) {
    console.log(`Error when reading the contract. ${error}`);
  }
  return null;
}
