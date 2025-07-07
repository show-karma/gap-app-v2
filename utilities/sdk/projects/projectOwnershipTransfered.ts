import { errorManager } from "@/components/Utilities/errorManager";
import {
  GAP,
  type Project,
  type SignerOrProvider,
} from "@show-karma/karma-gap-sdk";

export async function isOwnershipTransfered(
  signer: SignerOrProvider,
  project: Project,
  newOwner: `0x${string}`
): Promise<boolean> {
  try {
    const { uid, chainID } = project;

    const resolver = await GAP.getProjectResolver(signer as any, chainID);

    const response = await resolver.read?.("isOwner", [uid, newOwner]);
    const isowner = response as boolean;
    return isowner;
  } catch (error: any) {
    errorManager(`Error getting project owner: ${project.uid}`, error);
    return false;
  }
}
