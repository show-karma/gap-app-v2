import { Project } from "@show-karma/karma-gap-sdk";

export const deleteProject = async (
  project: Project,
  signer: any,
  gap: any
) => {
  try {
    if (!gap) return;
    await project.revoke(signer as any);
  } catch (error: any) {
    throw new Error(error);
  }
};
