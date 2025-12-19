import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const registryService = {
  searchProgramById: async (
    id: string
  ): Promise<GrantProgram | undefined> => {
    try {
      // Use V2 endpoint which doesn't require chainId
      const [res, error] = await fetchData(INDEXER.REGISTRY.V2.GET_BY_ID(id));
      if (error) throw Error(error);
      // V2 API wraps response in { data: program }
      return res?.data;
    } catch (error: any) {
      errorManager(`Error while searching for program by id`, error);
    }
  },
};
