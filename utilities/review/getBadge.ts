import { readContract } from "viem/actions";
import { createPublicClient, http, stringToBytes } from "viem";
import { arbitrum } from "viem/chains";
import { BADGE_REGISTRY } from "./constants/constants";
import { BADGE_REGISTRY_ABI } from "./constants/abi";
import { encodeBytes32String } from "ethers";
interface Badge {
  name: string;
  description: string;
  metadata: string; // Image IPFS
  data: string;
}

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

//Test
function toBytes32(hexString: string): string {
  if (hexString.startsWith("0x")) {
    hexString = hexString.slice(2);
  }

  if (hexString.length > 64) {
    throw new Error("Hex string is too long to be converted to bytes32");
  }

  while (hexString.length < 64) {
    hexString = "0" + hexString;
  }

  return "0x" + hexString;
}

export async function getBadge(badgeId: string): Promise<Badge | Error> {
  //Testing
  console.log("badgeId", badgeId);
  const badgeIdBytes32 = stringToBytes(badgeId, { size: 32 });
  const badgeIdBytes312 = encodeBytes32String(badgeId);
  console.log("badgeIdBytes32", badgeIdBytes32);
  console.log("badgeIdBytes312", badgeIdBytes312);
  console.log("tobytes", toBytes32(badgeId));

  try {
    const badgeData = await readContract(publicClient, {
      address: BADGE_REGISTRY,
      functionName: "getBadge",
      abi: BADGE_REGISTRY_ABI,
      args: [badgeIdBytes312],
    });

    return badgeData as Badge;
  } catch (error) {
    console.log("error", error);
    return Error("Error when reading the contract");
  }
}
