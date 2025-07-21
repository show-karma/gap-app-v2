import errorManager from "@/lib/utils/error-manager";
import fetchData from "@/lib/utils/fetch-data";
import { INDEXER } from "@/services/indexer";

export interface Indicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
}

export interface GroupedIndicators {
  communityAdminCreated: Indicator[];
  projectOwnerCreated: Indicator[];
}

export const getIndicatorsByCommunity = async (communityId: string) => {
  try {
    const [data, error] = await fetchData(
      `${INDEXER.COMMUNITY.INDICATORS.COMMUNITY.LIST(communityId)}/grouped`
    );
    if (error) {
      throw error;
    }
    const groupedData = data as GroupedIndicators;
    return groupedData.communityAdminCreated || [];
  } catch (error) {
    errorManager("Error fetching indicators by community", error);
    return [];
  }
};

export const getGroupedIndicatorsByCommunity = async (communityId: string) => {
  try {
    const [data, error] = await fetchData(
      `${INDEXER.COMMUNITY.INDICATORS.COMMUNITY.LIST(communityId)}/grouped`
    );
    if (error) {
      throw error;
    }
    return data as GroupedIndicators;
  } catch (error) {
    errorManager("Error fetching grouped indicators by community", error);
    return {
      communityAdminCreated: [],
      projectOwnerCreated: [],
    };
  }
};
