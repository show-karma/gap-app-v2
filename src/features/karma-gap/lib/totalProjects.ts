import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";

export const getTotalProjects = async (communityId: string) => {
  try {
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.STATS(communityId),
      "GET",
      {},
      {},
      {},
      false
    );
    if (error || !data.projects) return 0;
    return data.projects;
  } catch {
    return 0;
  }
};
