import type { Hex } from "@show-karma/karma-gap-sdk";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Community } from "@/types/v2/community";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { getCommunityDetails } from "../queries/v2/community";

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
      const community = await getCommunityDetails(uid);
      return (community || undefined) as T;
    }

    return undefined;
  } catch (error: unknown) {
    errorManager(`Error getting metadata of ${type}: ${uid}`, error);
    return undefined;
  }
};
