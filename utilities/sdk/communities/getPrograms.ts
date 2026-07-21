import type { Hex } from "@show-karma/karma-gap-sdk";
import type { GrantProgram } from "@/components/Pages/ProgramRegistry/ProgramList";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

export const getPrograms = async (uid: Hex): Promise<GrantProgram[]> => {
  try {
    // TODO(#1775): add zod schema
    return await api.get<GrantProgram[]>(INDEXER.COMMUNITY.PROGRAMS(uid));
  } catch (error: unknown) {
    errorManager(`Error getting programs of community: ${uid}`, error);
    return [];
  }
};
