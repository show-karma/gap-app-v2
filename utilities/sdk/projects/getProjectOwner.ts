import { errorManager } from "@/components/Utilities/ErrorManager";
import {
  GAP,
  type Project,
  type SignerOrProvider,
} from "@show-karma/karma-gap-sdk";

export async function getProjectOwner(
  signer: SignerOrProvider,
  project: Project
): Promise<boolean> {
  const publicAddress = signer.getAddress();
  try {
    const { uid, chainID } = project;

    const resolver = await GAP.getProjectResolver(signer as any, chainID);
    const response = await resolver.isAdmin(uid, publicAddress);
    const isowner = response;
    return isowner;
  } catch (error) {
    errorManager(`Error getting project owner: ${project.uid}`, error);
    return false;
  }
}
