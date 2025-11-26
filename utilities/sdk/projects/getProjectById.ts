import type { Project } from "@show-karma/karma-gap-sdk/core/class/entities/Project";
import type { Hex } from "viem";
import { errorManager } from "@/components/Utilities/errorManager";
import { getDefaultGapChainId, getGapClient } from "@/hooks/useGap";
import { zeroUID } from "@/utilities/commons";

export const getProjectById = async (projectId: string): Promise<Project | undefined> => {
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
  } catch (error: unknown) {
    errorManager(`Error getting project: ${projectId}`, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};
