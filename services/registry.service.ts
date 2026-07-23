import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

export const registryService = {
  searchProgramById: async (id: string): Promise<GrantProgram | undefined> => {
    try {
      // TODO(#1775): add zod schema
      return await api.get<GrantProgram>(INDEXER.REGISTRY.V2.GET_BY_ID(id));
    } catch (error: unknown) {
      errorManager(`Error while searching for program by id`, error);
      return undefined;
    }
  },
};
