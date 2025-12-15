import type { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";
import type { SignerOrProvider } from "@show-karma/karma-gap-sdk/core/types";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { getRPCClient } from "./rpcClient";

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
    const client = await getRPCClient(project.chainID);
    // Cast to SignerOrProvider - SDK accepts viem PublicClient
    const signer = client as unknown as SignerOrProvider;

    await Promise.all(
      project.members
        .filter((member) => member.address)
        .map(async (member) => {
          const memberAddress = member.address;
          const isProjectOwner = await projectInstance
            .isOwner(signer, memberAddress)
            .catch((_error) => {
              return false;
            });
          const isProjectAdmin = await projectInstance
            .isAdmin(signer, memberAddress)
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
