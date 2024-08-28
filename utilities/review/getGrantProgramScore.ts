import { readContract } from "viem/actions";
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { RESOLVER_TRUSTFUL } from "./constants/constants";
import { RESOLVER_TRUSTFUL_ABI } from "./constants/abi";

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

export async function getGrantProgramScore(grantUID: string): Promise<number> {
  try {
    const grantStory = await readContract(publicClient, {
      address: RESOLVER_TRUSTFUL,
      functionName: "getGrantProgramScore",
      abi: RESOLVER_TRUSTFUL_ABI,
      args: [grantUID],
    });

    return grantStory as number;
  } catch (error) {
    throw new Error("Error when reading the contract");
  }
}
