import { readContract } from "viem/actions";
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { RESOLVER_TRUSTFUL } from "./constants/constants";
import { RESOLVER_TRUSTFUL_ABI } from "./constants/abi";

export interface GrantStory {
  timestamp: number;
  txUID: string;
  badgeIds: string[];
  badgeScores: number[];
  averageScore: number;
}

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

export async function getGrantStories(
  grantUID: string
): Promise<GrantStory | Error> {
  try {
    const grantStory = await readContract(publicClient, {
      address: RESOLVER_TRUSTFUL,
      functionName: "getGrantStories",
      abi: RESOLVER_TRUSTFUL_ABI,
      args: [grantUID],
    });

    return grantStory as GrantStory;
  } catch (error) {
    return Error("Error when reading the contract");
  }
}
