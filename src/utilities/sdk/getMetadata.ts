import type { Hex } from "@show-karma/karma-gap-sdk";
import { envVars } from "@/config/env";
import errorManager from "@/lib/utils/error-manager";
import { gapIndexerApi } from "../gapIndexerApi";

export const getMetadata = async <T>(
  type: "project" | "community" | "grant",
  uid: Hex
): Promise<T | undefined> => {
  const apiUrl = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
  try {
    if (!apiUrl) throw new Error("Indexer url not set.");
    if (type === "project") {
      const project = await gapIndexerApi
        .projectBySlug(uid)
        .then((res) => res.data)
        .catch(() => undefined);
      return project as T;
    }
    if (type === "community") {
      const community = await gapIndexerApi
        .communityBySlug(uid)
        .then((res) => res.data)
        .catch(() => undefined);
      return community as T;
    }
    if (type === "grant") {
      const grant = await gapIndexerApi
        .grantBySlug(uid)
        .then((res) => res.data)
        .catch(() => undefined);
      return grant as T;
    }

    return undefined;
  } catch (error: any) {
    errorManager(`Error getting metadata of ${type}: ${uid}`, error);
    console.log(error);
    return undefined;
  }
};
