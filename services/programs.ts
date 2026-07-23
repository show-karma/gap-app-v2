import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

export const programService = {
  // Get all programs for a community
  getCommunityPrograms: async (communityId: string): Promise<GrantProgram[]> => {
    try {
      // TODO(#1775): add zod schema
      return await api.get<GrantProgram[]>(INDEXER.PROGRAMS.COMMUNITY(communityId));
    } catch (error: any) {
      errorManager(`Error fetching programs for community ${communityId}`, error);
      throw error;
    }
  },
};
