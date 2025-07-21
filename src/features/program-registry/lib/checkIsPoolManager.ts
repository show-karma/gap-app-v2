import errorManager from "@/lib/utils/error-manager";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";

export const checkIsPoolManager = async (address: string) => {
  try {
    const isPoolManager = await fetchData(
      INDEXER.REGISTRY.GET_ALL + `?isValid=all&owners=${address.toLowerCase()}`
    ).then(([res, error]) => {
      if (!error && res) {
        return res.count > 0;
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
