import { GrantProgram } from "@/features/program-registry/types";
import errorManager from "@/lib/utils/error-manager";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";

export const programService = {
  // Get all programs for a community
  getCommunityPrograms: async (
    communityId: string
  ): Promise<GrantProgram[]> => {
    try {
      const [data, error] = await fetchData(
        INDEXER.PROGRAMS.COMMUNITY(communityId)
      );

      if (error) {
        throw new Error(error);
      }

      return data as GrantProgram[];
    } catch (error: any) {
      errorManager(
        `Error fetching programs for community ${communityId}`,
        error
      );
      throw error;
    }
  },

  // Get a specific program by ID
  getProgram: async (programId: string): Promise<GrantProgram> => {
    try {
      const [data, error] = await fetchData(INDEXER.PROGRAMS.GET(programId));

      if (error) {
        throw new Error(error);
      }

      return data as GrantProgram;
    } catch (error: any) {
      errorManager(`Error fetching program ${programId}`, error);
      throw error;
    }
  },
};
