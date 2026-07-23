import { z } from "zod";
import { errorManager } from "@/components/Utilities/errorManager";
import type { RegionOption } from "@/hooks/useCommunityRegions";
import { api } from "../api/client";
import { INDEXER } from "../indexer";

const RegionOptionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    communityId: z.string(),
    isDeleted: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

const CommunityRegionsResponseSchema = z.array(RegionOptionSchema);

export const getCommunityRegions = async (communityId: string): Promise<RegionOption[]> => {
  try {
    const data = await api.get<RegionOption[]>(INDEXER.COMMUNITY.REGIONS(communityId), {
      schema: CommunityRegionsResponseSchema,
    });
    const orderedRegions = data.sort((a: RegionOption, b: RegionOption) => {
      return a.name.localeCompare(b.name, "en");
    });
    return orderedRegions;
  } catch (error) {
    errorManager("Error fetching community regions", error);
    return [];
  }
};
