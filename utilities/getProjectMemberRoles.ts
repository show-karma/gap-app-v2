import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getRPCClient } from "./rpcClient";
import { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";
import type { SignerOrProvider } from "@show-karma/karma-gap-sdk/core/types";

export interface Member {
  uid: string;
  recipient: string;
  details?: {
    name?: string;
  };
  role?: "Owner" | "Admin" | "Member";
}
export const getProjectMemberRoles = async (
  project: IProjectResponse,
  projectInstance: Project
) => {
  const roles: Record<string, Member["role"]> = {};
  if (project?.members) {
    const client = await getRPCClient(project.chainID);
    // Cast to SignerOrProvider - SDK accepts viem PublicClient
    const signer = client as unknown as SignerOrProvider;

    await Promise.all(
      project.members
        .filter((member) => member.recipient).map(async (member) => {
        const isProjectOwner = await projectInstance
          .isOwner(signer, member.recipient)
          .catch((error) => {
            return false;
          });
        const isProjectAdmin = await projectInstance
          .isAdmin(signer, member.recipient)
          .catch((error) => {
            return false;
          });
        if (!roles[member.recipient.toLowerCase()]) {
          roles[member.recipient.toLowerCase()] = isProjectOwner
            ? "Owner"
            : isProjectAdmin
            ? "Admin"
            : "Member";
        }
      })
    );
  }
  if (project?.recipient && !roles[project.recipient.toLowerCase()]) {
    roles[project.recipient.toLowerCase()] = "Owner";
  }

  return roles;
};
