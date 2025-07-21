import errorManager from "@/lib/utils/error-manager";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";

export interface UnlinkedIndicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  createdAt: string;
  updatedAt: string;
}

export const getUnlinkedIndicators = async (): Promise<UnlinkedIndicator[]> => {
  try {
    const [data, error] = await fetchData(INDEXER.INDICATORS.UNLINKED());
    if (error) {
      throw error;
    }
    return data as UnlinkedIndicator[];
  } catch (error) {
    errorManager("Error fetching unlinked indicators", error);
    return [];
  }
};
