import errorManager from "@/lib/utils/error-manager";
import { getGapClient } from "@/hooks/useGap";
import { zeroUID } from "@/lib/utils/misc";
import { appNetwork } from "@/config/network";
import type { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";
import { Hex } from "viem";

export const getProjectById = async (
  projectId: string
): Promise<Project | undefined> => {
  try {
    const gap = getGapClient(appNetwork[0].id);
    if (!gap) return;
    const fetchedProject = await (projectId.startsWith("0x")
      ? gap.fetch.projectById(projectId as Hex)
      : gap.fetch.projectBySlug(projectId));

    if (!fetchedProject || fetchedProject.uid === zeroUID) {
      return;
    }
    return fetchedProject;
  } catch (error: any) {
    console.log(error);
    errorManager(`Error getting project: ${projectId}`, error);
    throw new Error(error);
  }
};
