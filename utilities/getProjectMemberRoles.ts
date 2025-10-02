import { getGapClient } from "@/hooks/useGap";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { getChainNameById } from "./network";
import { rpcClient } from "./rpcClient";
import { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";

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
    const gap = getGapClient(project.chainID);
    const chainName = getChainNameById(project.chainID);
    const client = rpcClient[chainName as keyof typeof rpcClient];
    await Promise.all(
      project.members.map(async (member) => {
        // Skip members without a recipient address
        if (!member.recipient) {
          return;
        }

        const isProjectOwner = await projectInstance
          .isOwner(client as any, member.recipient)
          .catch((error) => {
            return false;
          });
        const isProjectAdmin = await projectInstance
          .isAdmin(client as any, member.recipient)
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
  if (!roles[project?.recipient.toLowerCase()]) {
    roles[project?.recipient.toLowerCase()] = "Owner";
  }

  return roles;
};
