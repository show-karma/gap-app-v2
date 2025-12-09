import type { Hex } from "@show-karma/karma-gap-sdk";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export const getMetadata = async <T>(
  type: "project" | "community",
  uid: Hex
): Promise<T | undefined> => {
  try {
    if (type === "project") {
      const [project, error] = await fetchData(INDEXER.V2.PROJECTS.GET(uid));
      if (error || !project) return undefined;
      return project as T;
    }
    if (type === "community") {
      const [community, error] = await fetchData(INDEXER.COMMUNITY.V2.GET(uid));
      if (error || !community) return undefined;
      return community as T;
    }

    return undefined;
  } catch (error: unknown) {
    errorManager(`Error getting metadata of ${type}: ${uid}`, error);
    return undefined;
  }
};
