import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "../api/client";
import { INDEXER } from "../indexer";

// TODO(#1775): add zod schema — endpoint shape is otherwise untyped.
interface CommunityHeaderStatsResponse {
  noOfPrograms?: number;
  noOfGrants?: number;
  noOfProjects?: number;
  [key: string]: unknown;
}

export const getHeaderStats = async (communityId: string) => {
  try {
    const data = await api.get<CommunityHeaderStatsResponse>(
      INDEXER.COMMUNITY.PAGE_HEADER_STATS(communityId),
      { isAuthorized: false }
    );
    return {
      noOfPrograms: data.noOfPrograms,
      noOfGrants: data.noOfGrants,
      noOfProjects: data.noOfProjects,
    };
  } catch (error) {
    errorManager("Error fetching header stats", error);
    return {
      noOfPrograms: 0,
      noOfGrants: 0,
      noOfProjects: 0,
    };
  }
};
