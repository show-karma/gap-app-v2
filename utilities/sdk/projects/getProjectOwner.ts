import { type Project, type SignerOrProvider } from "@show-karma/karma-gap-sdk";

export async function getProjectOwner(
  signer: SignerOrProvider,
  project: Project
): Promise<boolean> {
  try {
    const isowner = await project.isOwner(signer);
    return isowner;
  } catch (error) {
    console.error("isOwnerError", error);
    return false;
  }
}
