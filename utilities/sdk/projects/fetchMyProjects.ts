import { errorManager } from "@/components/Utilities/errorManager";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

export const fetchMyProjects = async (address: `0x${string}` | undefined) => {
  if (!address) return;
  try {
    const { data: projectsOf } = await gapIndexerApi.projectsOf(address);
    return projectsOf;
  } catch (error: any) {
    errorManager(`Error fetching projects of ${address}`, error);
  }
};
