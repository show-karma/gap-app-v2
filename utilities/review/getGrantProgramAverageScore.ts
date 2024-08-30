import { readContract } from "viem/actions";
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { RESOLVER_TRUSTFUL, SCORER_DECIMALS } from "./constants/constants";

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

/// See {TrustfulResolver-getGrantProgramAverageScore} in the contract.
/// Gets the average score of a grant program.
///
/// Requirement:
/// - The grant program must exist
/// - The grant program must have at least one review.
///
/// NOTE: The result will be multiplied by the decimals in the Scorer.
/// Solidity can't handle floating points, so you can get the decimals by
/// calling {ITrustfulScorer.getScorerDecimals} and dividing the result.
export async function getGrantProgramAverageScore(grantUID: number): Promise<number | null> {
  const abi = [
    {
      inputs: [{ internalType: "uint256", name: "grantProgramUID", type: "uint256" }],
      name: "getGrantProgramAverageScore",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ];

  try {
    const grantProgramScore = await readContract(publicClient, {
      address: RESOLVER_TRUSTFUL,
      functionName: "getGrantProgramAverageScore",
      abi: abi,
      args: [grantUID],
    });

    try {
      const grantStoryAsANumber = Number(grantProgramScore);

      if (Number.isNaN(grantStoryAsANumber)) {
        console.log("The result can't be NaN: getGrantProgramAverageScore");
      }
    } catch (error) {
      console.log("Error when converting the result to a number: getGrantProgramAverageScore");
    }

    // format big number to floated point number
    const floatedNumber = (Number(grantProgramScore) / 10 ** SCORER_DECIMALS).toFixed(1);

    return Number(floatedNumber);
  } catch (error) {
    console.log("Error when reading the contract");
  }
  return null;
}
