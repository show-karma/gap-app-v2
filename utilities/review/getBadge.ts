import { createPublicClient, http } from "viem";
import { readContract } from "viem/actions";
import { arbitrum } from "viem/chains";

import { Badge } from "@/types/review";

import { BADGE_REGISTRY } from "./constants/constants";
import { BADGE_REGISTRY_ABI } from "./constants/abi";

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

/// See {BadgeRegistry-getBadge} in the contract.
/// Retrieves a badge by its ID.
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
    throw new Error(`Error when reading the contract. ${error}`);
  }
}
