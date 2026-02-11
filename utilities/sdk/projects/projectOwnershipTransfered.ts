import { GAP, type Project, type SignerOrProvider } from "@show-karma/karma-gap-sdk";
import { errorManager } from "@/components/Utilities/errorManager";
import { getGapRpcConfig } from "@/hooks/useGap";

export async function isOwnershipTransfered(
  signer: SignerOrProvider,
  project: Project,
  newOwner: `0x${string}`
): Promise<boolean> {
  try {
    const { uid, chainID } = project;

    const resolver = await GAP.getProjectResolver(signer, getGapRpcConfig(), chainID);

    const response = await resolver.isOwner(uid, newOwner);
    const isowner = response;
    return isowner;
  } catch (error: unknown) {
    errorManager(`Error getting project owner: ${project.uid}`, error);
    return false;
  }
}
