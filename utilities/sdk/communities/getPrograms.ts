import type { Hex } from "@show-karma/karma-gap-sdk"
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList"
import { errorManager } from "@/components/Utilities/errorManager"
import fetchData from "@/utilities/fetchData"
import { INDEXER } from "@/utilities/indexer"

export const getPrograms = async (uid: Hex): Promise<GrantProgram[]> => {
  try {
    const [programs] = await fetchData(INDEXER.COMMUNITY.PROGRAMS(uid))
    if (!programs || programs.length === 0) return []

    return programs
  } catch (error: any) {
    errorManager(`Error getting programs of community: ${uid}`, error)
    return []
  }
}
