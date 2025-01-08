import { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

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
