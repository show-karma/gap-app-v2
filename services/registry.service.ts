import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { parseProgramIdAndChainId } from "@/components/Pages/ProgramRegistry/programUtils";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const registryService = {
  searchProgramById: async (id: string): Promise<GrantProgram | undefined> => {
    try {
      const [res, error] = await fetchData(INDEXER.REGISTRY.V2.GET_BY_ID(id));
      if (error) throw Error(error);
      return res;
    } catch (error: unknown) {
      errorManager(`Error while searching for program by id`, error);
      return undefined;
    }
  },
};
