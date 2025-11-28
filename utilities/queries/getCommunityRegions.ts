import { errorManager } from "@/components/Utilities/errorManager";
import type { RegionOption } from "@/hooks/useCommunityRegions";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export const getCommunityRegions = async (communityId: string): Promise<RegionOption[]> => {
  try {
    const [data, error] = await fetchData(INDEXER.COMMUNITY.REGIONS(communityId));
    if (error) {
      throw error;
    }
    const orderedRegions = data.sort((a: RegionOption, b: RegionOption) => {
      return a.name.localeCompare(b.name, "en");
    });
    return orderedRegions as RegionOption[];
  } catch (error) {
    errorManager("Error fetching community regions", error);
    return [];
  }
};
