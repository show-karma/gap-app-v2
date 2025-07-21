import { fetchData } from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";

/**
 * Fetches the activity feed for a project
 * @param projectIdOrSlug - The project ID or slug
 * @param page - The page number for pagination (optional)
 * @param limit - The number of items per page (optional)
 * @returns Promise with the feed data
 */
export const getProjectFeed = async (
  projectIdOrSlug: string,
  page?: number,
  limit?: number
) => {
  const params: any = {};
  if (page !== undefined) params.page = page;
  if (limit !== undefined) params.limit = limit;

  const [data, error] = await fetchData(
    INDEXER.PROJECT.FEED(projectIdOrSlug),
    "GET",
    {},
    params
  );

  if (error) {
    throw new Error(error);
  }

  return data;
};
