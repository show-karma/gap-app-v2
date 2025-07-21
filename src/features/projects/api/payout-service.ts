import { fetchData } from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";

/**
 * Updates the payout address for a project
 * @param projectUID - The project UID
 * @param address - The new payout address
 * @returns Promise<boolean> - Returns true if successful
 */
export const updatePayoutAddress = async (
  projectUID: string,
  address: string
): Promise<boolean> => {
  const [, error] = await fetchData(
    INDEXER.PROJECT.PAYOUT_ADDRESS.UPDATE(projectUID),
    "PUT",
    { address }
  );

  if (error) {
    throw new Error(error);
  }

  return true;
};

/**
 * Gets the payout address for a project
 * @param projectUID - The project UID
 * @returns Promise with the payout address data
 */
export const getPayoutAddress = async (projectUID: string) => {
  const [data, error] = await fetchData(
    INDEXER.PROJECT.PAYOUT_ADDRESS.GET(projectUID)
  );

  if (error) {
    throw new Error(error);
  }

  return data;
};
