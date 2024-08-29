import { readContract } from "viem/actions";
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { BADGE_REGISTRY } from "./constants/constants";
import { BADGE_REGISTRY_ABI } from "./constants/abi";
import { Badge } from "@/types/review";

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

/**
 * Retrieves a badge by its ID.
 *
 * @param badgeId - The ID of the badge to retrieve. Should be in Bytes32.
 * @returns A promise that resolves to the retrieved badge.
 * @throws If there is an error when reading the contract.
 */
export async function getBadge(badgeId: string): Promise<Badge> {
  try {
    const badgeData = await readContract(publicClient, {
      address: BADGE_REGISTRY,
      functionName: "getBadge",
      abi: BADGE_REGISTRY_ABI,
      args: [badgeId],
    });

    return badgeData as Badge;
  } catch (error) {
    console.log("Error when reading the contract", error);
    throw new Error("Error when reading the contract");
  }
}
