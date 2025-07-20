import errorManager from "@/lib/utils/error-manager";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

export const fetchMyProjects = async (address: `0x${string}` | undefined) => {
  if (!address) return;
  try {
    const { data: projectsOf } = await gapIndexerApi.projectsOf(address);
    return projectsOf || [];
  } catch (error: any) {
    errorManager(`Error fetching projects of ${address}`, error);
    return [];
  }
};
