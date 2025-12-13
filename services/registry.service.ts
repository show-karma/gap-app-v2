import { registryHelper } from "@/components/Pages/ProgramRegistry/helper";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { parseProgramIdAndChainId } from "@/components/Pages/ProgramRegistry/programUtils";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const registryService = {
  /**
   * Search for a program by ID, supporting both simple IDs and programId_chainID format
   * @param id - Program ID, optionally in format "programId_chainID"
   * @param chainId - Optional chain ID (used if id doesn't contain chain ID)
   * @returns The found program or undefined
   */
  searchProgramById: async (id: string, chainId?: number): Promise<GrantProgram | undefined> => {
    try {
      const defaultChainId = chainId ?? registryHelper.supportedNetworks;
      const { programId: parsedProgramId, chainId: parsedChainId } = parseProgramIdAndChainId(
        id,
        defaultChainId
      );

      const [data, error] = await fetchData(
        INDEXER.REGISTRY.FIND_BY_ID(parsedProgramId, parsedChainId)
      );
      if (error) throw Error(error);
      // Handle both array and single object responses
      if (Array.isArray(data)) {
        return data[0];
      }
      return data;
    } catch (error: unknown) {
      errorManager(`Error while searching for program by id`, error);
      return undefined;
    }
  },
};
