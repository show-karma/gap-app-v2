import { errorManager } from "@/components/Utilities/errorManager";
import { getGapClient, getDefaultGapChainId } from "@/hooks/useGap";
import { zeroUID } from "@/utilities/commons";
import type { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";
import { Hex } from "viem";

export const getProjectById = async (
  projectId: string
): Promise<Project | undefined> => {
  try {
    const defaultChainId = getDefaultGapChainId();
    if (!defaultChainId) return;
    const gap = getGapClient(defaultChainId);
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
