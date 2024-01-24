import type { Hex } from "@show-karma/karma-gap-sdk";

export const getMetadata = async <T>(
  type: "projects" | "communities" | "grants",
  uid: Hex
): Promise<(T & { uid: Hex }) | undefined> => {
  const apiUrl = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
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
