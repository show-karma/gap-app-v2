import type { Grant, Hex } from "@show-karma/karma-gap-sdk";
import type { SortByOptions, StatusOptions } from "@/types/filters";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";
import errorManager from "@/lib/utils/error-manager";
import { GrantProgram } from "@/features/program-registry/types";

export const getPrograms = async (uid: Hex): Promise<GrantProgram[]> => {
  try {
    const [programs] = await fetchData(INDEXER.COMMUNITY.PROGRAMS(uid));
    if (!programs || programs.length === 0) return [];

    return programs;
  } catch (error: any) {
    errorManager(`Error getting programs of community: ${uid}`, error);
    console.log(error);
    return [];
  }
};
