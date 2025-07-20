import errorManager from "@/lib/utils/error-manager";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "../indexer";
import { GrantProgram } from "@/features/program-registry/types";

export async function getAllProgramsOfCommunity(communityId: string) {
  try {
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.PROGRAMS(communityId)
    );
    if (error) {
      throw error;
    }
    return data as GrantProgram[];
  } catch (error) {
    errorManager(`Error fetching programs of community ${communityId}`, error);
    return [];
  }
}
