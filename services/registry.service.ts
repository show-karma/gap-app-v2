import { registryHelper } from "@/components/Pages/ProgramRegistry/helper"
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList"
import { errorManager } from "@/components/Utilities/errorManager"
import fetchData from "@/utilities/fetchData"
import { INDEXER } from "@/utilities/indexer"

export const registryService = {
  searchProgramById: async (
    id: string,
    chainId: number = registryHelper.supportedNetworks
  ): Promise<GrantProgram | undefined> => {
    try {
      const [data, error] = await fetchData(INDEXER.REGISTRY.FIND_BY_ID(id, chainId))
      if (error) throw Error(error)
      return data
    } catch (error: any) {
      errorManager(`Error while searching for program by id`, error)
      console.log(error)
    }
  },
}
