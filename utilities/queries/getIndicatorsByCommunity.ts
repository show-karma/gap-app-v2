import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "../fetchData";
import { INDEXER } from "../indexer";

export interface ProgramReference {
  programId: string;
  chainID: number;
}

export interface Indicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  programs?: ProgramReference[];
  communityUID?: string | null;
  syncType?: "auto" | "manual";
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  payload: T[];
  pagination: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
    nextPage: number | null;
    prevPage: number | null;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface GroupedIndicators {
  communityAdminCreated: Indicator[];
  projectOwnerCreated: Indicator[];
}

// V2 API response type (programId is number from backend)
interface V2Indicator {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  programs?: { programId: number; chainID: number }[] | null;
  communityUID?: string | null;
  syncType?: "auto" | "manual";
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Transform V2 indicator to frontend Indicator type
 */
function transformIndicator(v2Indicator: V2Indicator): Indicator {
  return {
    ...v2Indicator,
    programs: v2Indicator.programs?.map(p => ({
      programId: String(p.programId),
      chainID: p.chainID
    })) || undefined,
  };
}

/**
 * Get indicators by community using V2 API
 */
export const getIndicatorsByCommunity = async (communityId: string) => {
  try {
    const [data, error] = await fetchData(
      INDEXER.INDICATORS.V2.LIST({ communityUID: communityId, limit: 100 })
    );
    if (error) {
      throw error;
    }
    const paginatedData = data as PaginatedResponse<V2Indicator>;
    return (paginatedData.payload || []).map(transformIndicator);
  } catch (error) {
    errorManager("Error fetching indicators by community", error);
    return [];
  }
};

/**
 * Get grouped indicators by community
 * Note: V2 API doesn't have grouped endpoint, so we fetch all and group by syncType
 */
export const getGroupedIndicatorsByCommunity = async (communityId: string) => {
  try {
    const [data, error] = await fetchData(
      INDEXER.INDICATORS.V2.LIST({ communityUID: communityId, limit: 100 })
    );
    if (error) {
      throw error;
    }
    const paginatedData = data as PaginatedResponse<V2Indicator>;
    const indicators = (paginatedData.payload || []).map(transformIndicator);

    // Group indicators: auto-synced are system/admin created, manual are project owner created
    return {
      communityAdminCreated: indicators.filter(i => i.syncType === "auto" || !i.syncType),
      projectOwnerCreated: indicators.filter(i => i.syncType === "manual"),
    };
  } catch (error) {
    errorManager("Error fetching grouped indicators by community", error);
    return {
      communityAdminCreated: [],
      projectOwnerCreated: [],
    };
  }
};

/**
 * Get all indicators with pagination using V2 API
 */
export const getIndicatorsV2 = async (params?: {
  communityUID?: string;
  programId?: number;
  chainId?: number;
  syncType?: "auto" | "manual";
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Indicator>> => {
  try {
    const [data, error] = await fetchData(INDEXER.INDICATORS.V2.LIST(params));
    if (error) {
      throw error;
    }
    const paginatedData = data as PaginatedResponse<V2Indicator>;
    return {
      payload: (paginatedData.payload || []).map(transformIndicator),
      pagination: paginatedData.pagination,
    };
  } catch (error) {
    errorManager("Error fetching indicators", error);
    return {
      payload: [],
      pagination: {
        totalCount: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        nextPage: null,
        prevPage: null,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }
};

/**
 * Get a single indicator by ID using V2 API
 */
export const getIndicatorById = async (indicatorId: string): Promise<Indicator | null> => {
  try {
    const [data, error] = await fetchData(
      INDEXER.INDICATORS.V2.GET_BY_ID(indicatorId)
    );
    if (error) {
      throw error;
    }
    return transformIndicator(data as V2Indicator);
  } catch (error) {
    errorManager("Error fetching indicator by ID", error);
    return null;
  }
};
