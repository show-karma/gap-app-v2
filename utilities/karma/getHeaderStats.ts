import { errorManager } from "@/components/Utilities/errorManager"
import fetchData from "../fetchData"
import { INDEXER } from "../indexer"

export const getHeaderStats = async (communityId: string) => {
  try {
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.PAGE_HEADER_STATS(communityId),
      "GET",
      {},
      {},
      {},
      false
    )
    if (error) {
      throw new Error(error || "Error fetching header stats")
    }
    return {
      noOfPrograms: data.noOfPrograms,
      noOfGrants: data.noOfGrants,
      noOfProjects: data.noOfProjects,
    }
  } catch (error) {
    errorManager("Error fetching header stats", error)
    return {
      noOfPrograms: 0,
      noOfGrants: 0,
      noOfProjects: 0,
    }
  }
}
