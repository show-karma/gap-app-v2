import { GapContract } from "@show-karma/karma-gap-sdk/core/class/contract/GapContract";
import type { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";
import { ethers } from "ethers";
import type { Project as ProjectResponse } from "@/types/v2/project";
import { getGapRpcConfig } from "./gapRpcConfig";
import { getRPCUrlByChainId } from "./rpcClient";

export interface Member {
  uid: string;
  recipient: string;
  details?: {
    name?: string;
  };
  role?: "Owner" | "Admin" | "Member";
}
export const getProjectMemberRoles = async (
  project: ProjectResponse,
  _projectInstance: Project
) => {
  const roles: Record<string, Member["role"]> = {};
  if (project?.members) {
    const rpcUrl = getRPCUrlByChainId(project.chainID);
    if (!rpcUrl) return roles;
    const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
    const rpcConfig = getGapRpcConfig();

    await Promise.all(
      project.members
        .filter((member) => member.address)
        .map(async (member) => {
          const memberAddress = member.address;
          const isProjectOwner = await GapContract.isProjectOwner(
            rpcProvider,
            project.uid,
            project.chainID,
            memberAddress,
            rpcConfig
          ).catch((_error) => {
            return false;
          });
          const isProjectAdmin = await GapContract.isProjectAdmin(
            rpcProvider,
            project.uid,
            project.chainID,
            memberAddress,
            rpcConfig
          ).catch((_error) => {
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
