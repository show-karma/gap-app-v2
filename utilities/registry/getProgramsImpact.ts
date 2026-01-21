import { errorManager } from "@/components/Utilities/errorManager";
import type { ProgramImpactData } from "@/types/programs";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

/**
 * API response interfaces for the impact endpoint
 * Exported for potential reuse in other parts of the codebase
 */
export interface ImpactApiImpact {
  name: string;
  id: string;
  description: string;
  type: "output" | "outcome";
  indicatorIds: string[];
}

export interface ImpactApiCategory {
  categoryName: string;
  impacts: ImpactApiImpact[];
}

export interface ImpactApiResponse {
  stats: {
    totalCategories: number;
    totalProjects: number;
    totalFundingAllocated: string | null;
  };
  categories: ImpactApiCategory[];
}

/**
 * Fetches impact data for a community from the backend.
 * The backend handles all business logic (grouping, stats calculation, etc.)
 *
 * @param communityId - Community slug or UID
 * @returns ProgramImpactData with stats and categorized impact segments
 */
export async function getProgramsImpact(communityId: string): Promise<ProgramImpactData> {
  try {
    const [data, error] = await fetchData<ImpactApiResponse>(
      INDEXER.COMMUNITY.V2.IMPACT(communityId)
    );

    if (error || !data) {
      console.warn("Impact fetch error:", error);
      return {
        data: [],
        stats: {
          totalCategories: 0,
          totalProjects: 0,
          totalFundingAllocated: undefined,
        },
      };
    }

    // Transform API response to match existing ProgramImpactData structure
    return {
      stats: {
        totalCategories: data.stats.totalCategories,
        totalProjects: data.stats.totalProjects,
        totalFundingAllocated: data.stats.totalFundingAllocated || undefined,
      },
      data: data.categories.map((cat: ImpactApiCategory) => ({
        categoryName: cat.categoryName,
        impacts: cat.impacts.map((impact: ImpactApiImpact) => ({
          categoryName: cat.categoryName,
          impactSegmentName: impact.name,
          impactSegmentId: impact.id,
          impactSegmentDescription: impact.description,
          impactSegmentType: impact.type,
          impactIndicatorIds: impact.indicatorIds,
          indicators: [],
        })),
      })),
    };
  } catch (error) {
    console.error("Error fetching program impact:", error);
    errorManager("Error fetching program impact", error);
    return {
      data: [],
      stats: {
        totalCategories: 0,
        totalProjects: 0,
        totalFundingAllocated: undefined,
      },
    };
  }
}
