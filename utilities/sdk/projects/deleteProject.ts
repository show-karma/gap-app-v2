import { getGapClient } from "@/hooks";
import { zeroUID } from "@/utilities/commons";
import { appNetwork } from "@/utilities/network";
import { Project } from "@show-karma/karma-gap-sdk";
import { Hex } from "viem";

export const deleteProject = async (project: Project, signer: any) => {
  try {
    const gap = getGapClient(appNetwork[0].id);
    if (!gap) return;
    await project.revoke(signer as any);
  } catch (error: any) {
    console.log(error);
    throw new Error(error);
  }
};
