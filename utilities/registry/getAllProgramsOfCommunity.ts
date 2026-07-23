import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "../api/client";
import { INDEXER } from "../indexer";

export async function getAllProgramsOfCommunity(communityId: string) {
  try {
    // TODO(#1775): add zod schema — GrantProgram is a large shared type
    // (FundingProgramResponse) not safe to re-derive as a strict schema here.
    return await api.get<GrantProgram[]>(INDEXER.COMMUNITY.PROGRAMS(communityId));
  } catch (error) {
    errorManager(`Error fetching programs of community ${communityId}`, error);
    return [];
  }
}
