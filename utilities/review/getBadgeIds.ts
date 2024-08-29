import { readContract } from "viem/actions";
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { SCORER_ID, TRUSTFUL_SCORER } from "./constants/constants";
import { TRUSTFUL_SCORER_ABI } from "./constants/abi";

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

/**
 * Retrieves the badge IDs from the contract.
 * @returns A promise that resolves to an array of string badge IDs.
 * @throws If there is an error when reading the contract.
 */
export async function getBadgeIds(): Promise<string[]> {
  try {
    const badgeIds = await readContract(publicClient, {
      address: TRUSTFUL_SCORER,
      functionName: "getBadgesIds",
      abi: TRUSTFUL_SCORER_ABI,
      args: [SCORER_ID],
    });

    return badgeIds as string[];
  } catch (error) {
    console.log("Error when reading the contract", error);
    throw new Error("Error when reading the contract");
  }
}
