import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export interface Indicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
}

export const getIndicatorsByCommunity = async (communityId: string) => {
  try {
    const [data, error] = await fetchData(
      INDEXER.COMMUNITY.INDICATORS.COMMUNITY.LIST(communityId)
    );
    if (error) {
      throw error;
    }
    return data as Indicator[];
  } catch (error) {
    errorManager("Error fetching indicators by community", error);
    return [];
  }
};
