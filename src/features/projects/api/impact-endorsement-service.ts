import { fetchData } from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";

/**
 * Sends a notification for impact endorsement
 * @param projectIdOrSlug - The project ID or slug
 * @param endorsementData - The endorsement notification data
 * @returns Promise<boolean> - Returns true if successful
 */
export const notifyEndorsement = async (
  projectIdOrSlug: string,
  endorsementData: {
    email: string;
    message?: string;
  }
): Promise<boolean> => {
  const [, error] = await fetchData(
    INDEXER.PROJECT.ENDORSEMENT.NOTIFY(projectIdOrSlug),
    "POST",
    endorsementData
  );

  if (error) {
    throw new Error(error);
  }

  return true;
};
