import { readContract } from "viem/actions";
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { RESOLVER_TRUSTFUL } from "./constants/constants";
import { GrantStory } from "@/types/review";

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

/// See {TrustfulResolver-getGrantStories} in the contract.
/// Get the stories of the grant in the timeline.
export async function getGrantStories(grantUID: string): Promise<GrantStory[] | null> {
  const abi = [
    {
      inputs: [{ internalType: "bytes32", name: "grantUID", type: "bytes32" }],
      name: "getGrantStories",
      outputs: [
        {
          components: [
            { internalType: "uint256", name: "timestamp", type: "uint256" },
            { internalType: "bytes32", name: "txUID", type: "bytes32" },
            { internalType: "bytes32[]", name: "badgeIds", type: "bytes32[]" },
            { internalType: "uint8[]", name: "badgeScores", type: "uint8[]" },
            { internalType: "uint256", name: "averageScore", type: "uint256" },
          ],
          internalType: "struct IResolver.GrantStory[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ];

  try {
    const grantStory = await readContract(publicClient, {
      address: RESOLVER_TRUSTFUL,
      functionName: "getGrantStories",
      abi: abi,
      args: [grantUID],
    });

    return grantStory as GrantStory[];
  } catch (error) {
    console.log("Error when reading the contract");
  }
  return null;
}
