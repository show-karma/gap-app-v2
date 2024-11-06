import { createPublicClient, Hex, http } from "viem";
import { readContract } from "viem/actions";
import { arbitrum } from "viem/chains";

import { Badge } from "@/types/review";

import { BADGE_REGISTRY } from "./constants";

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

/// See {BadgeRegistry-getBadge} in the contract.
/// Retrieves a badge by its ID.
export async function getBadge(badgeId: Hex): Promise<Badge | null> {
  const abi = [
    {
      inputs: [{ internalType: "bytes32", name: "badgeId", type: "bytes32" }],
      name: "getBadge",
      outputs: [
        {
          components: [
            { internalType: "string", name: "name", type: "string" },
            { internalType: "string", name: "description", type: "string" },
            { internalType: "string", name: "metadata", type: "string" },
            { internalType: "bytes", name: "data", type: "bytes" },
          ],
          internalType: "struct IBadgeRegistry.Badge",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ];

  try {
    const badgeData = await readContract(publicClient, {
      address: BADGE_REGISTRY,
      functionName: "getBadge",
      abi: abi,
      args: [badgeId],
    });

    return badgeData as Badge;
  } catch (error) {
    console.log(`Error when reading the contract. Probably CORS. ${error}`);
  }
  return null;
}
