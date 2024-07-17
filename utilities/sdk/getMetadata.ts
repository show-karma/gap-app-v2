import { Hex } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { envVars } from "../enviromentVars";

export const getMetadata = async <T>(
  type: "projects" | "communities" | "grants",
  uid: Hex
): Promise<(T & { uid: Hex }) | undefined> => {
  const apiUrl = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
  try {
    if (!apiUrl) throw new Error("Indexer url not set.");
    const url = `${apiUrl}/${type}/${uid}/meta`;
    const response = await fetch(url).then((res) => res.json());

    return response as T & { uid: Hex };
  } catch (error) {
    console.log(error);
    return undefined;
  }
};
