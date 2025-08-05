import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

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
