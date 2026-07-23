import type { Hex } from "@show-karma/karma-gap-sdk";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { orElse } from "@/utilities/api/or-else";
import { INDEXER } from "@/utilities/indexer";
import { getCommunityDetails } from "../queries/v2/community";

export const getMetadata = async <T>(
  type: "project" | "community",
  uid: Hex
): Promise<T | undefined> => {
  try {
    if (type === "project") {
      // TODO(#1775): add zod schema
      return await orElse<T | undefined>(api.get<T>(INDEXER.V2.PROJECTS.GET(uid)), undefined);
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
