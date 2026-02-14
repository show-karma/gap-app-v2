import type { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";
import { JsonRpcProvider } from "ethers";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { getRPCUrlByChainId } from "./rpcClient";

export interface Member {
  uid: string;
  recipient: string;
  details?: {
    name?: string;
  };
  role?: "Owner" | "Admin" | "Member";
}
export const getProjectMemberRoles = async (project: ProjectResponse, projectInstance: Project) => {
  const roles: Record<string, Member["role"]> = {};
  if (project?.members) {
    const rpcUrl = getRPCUrlByChainId(project.chainID);
    if (!rpcUrl) return roles;
    const rpcProvider = new JsonRpcProvider(rpcUrl);

    await Promise.all(
      project.members
        .filter((member) => member.address)
        .map(async (member) => {
          const memberAddress = member.address;
          const isProjectOwner = await projectInstance
            .isOwner(rpcProvider, memberAddress)
            .catch((_error) => {
              return false;
            });
          const isProjectAdmin = await projectInstance
            .isAdmin(rpcProvider, memberAddress)
            .catch((_error) => {
              return false;
            });
          if (!roles[memberAddress.toLowerCase()]) {
            roles[memberAddress.toLowerCase()] = isProjectOwner
              ? "Owner"
              : isProjectAdmin
                ? "Admin"
                : "Member";
          }
        })
    );
  }
  if (project?.owner && !roles[project.owner.toLowerCase()]) {
    roles[project.owner.toLowerCase()] = "Owner";
  }

  return roles;
};
