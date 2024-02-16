import { getGapClient } from "@/hooks/useGap";
import { appNetwork } from "@/utilities/network";

export const searchProjects = async (search?: string) => {
  try {
    if (!search) return [];

    const gap = getGapClient(appNetwork[0].id);
    const projectsOf = await gap.fetch.searchProjects(search);
    return projectsOf;
  } catch (error) {
    console.error(error);
    return [];
  }
};
