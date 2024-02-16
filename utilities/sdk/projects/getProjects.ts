import type { Hex } from "@show-karma/karma-gap-sdk";

import { getGapClient } from "@/hooks/useGap";
import { appNetwork } from "@/utilities/network";

export const getProjectsOf = async (grantee: Hex) => {
  try {
    const gap = getGapClient(appNetwork[0].id);
    const projectsOf = await gap.fetch.projectsOf(grantee);
    return projectsOf;
  } catch (error) {
    console.log(error);
    return [];
  }
};
