import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export interface UnlinkedIndicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  createdAt: string;
  updatedAt: string;
}

export const getUnlinkedIndicators = async (
  search?: string
): Promise<UnlinkedIndicator[]> => {
  try {
    const [data, error] = await fetchData(INDEXER.INDICATORS.UNLINKED(search));
    if (error) {
      throw error;
    }
    return data as UnlinkedIndicator[];
  } catch (error) {
    errorManager("Error fetching unlinked indicators", error);
    return [];
  }
};
