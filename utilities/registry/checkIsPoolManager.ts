import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export const checkIsPoolManager = async (address: string) => {
  try {
    // Use V2 endpoint to check if user has any programs
    const url = INDEXER.REGISTRY.V2.GET_ALL({
      page: 1,
      limit: 1,
      owners: address.toLowerCase(),
    });

    const isPoolManager = await fetchData(url).then(([res, error]) => {
      if (!error && res && res.data && res.data.pagination) {
        // V2 API wraps response in { data: { payload, pagination } }
        return res.data.pagination.totalCount > 0;
      } else {
        return false;
      }
    });
    return isPoolManager;
  } catch (error: any) {
    errorManager(`Error checking if user ${address} is pool manager`, error);
    throw new Error();
  }
};
