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

  const { uid, chainID } = project;

  const resolver = await GAP.getProjectResolver(signer as any, chainID);
  const response = await resolver.isAdmin(uid, publicAddress);
  const isowner = response;
  return isowner;
}
