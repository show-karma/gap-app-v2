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
    programs:
      v2Indicator.programs?.map((p) => ({
        programId: String(p.programId),
        chainID: p.chainID,
      })) || undefined,
  };
}

/**
 * Fetch all pages of indicators for a given query
 * @param params - Query parameters for the indicators API
 * @param pageSize - Number of results per page (default 100)
 * @param maxPages - Maximum number of pages to fetch (default 50, safety limit)
 * @returns All indicators across all pages
 */
async function fetchAllIndicatorPages(
  params: {
    communityUID?: string;
    programId?: number;
    chainId?: number;
    syncType?: "auto" | "manual";
  },
  pageSize = 100,
  maxPages = 50
): Promise<Indicator[]> {
  const allIndicators: Indicator[] = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore && currentPage <= maxPages) {
    const [data, error] = await fetchData(
      INDEXER.INDICATORS.V2.LIST({ ...params, page: currentPage, limit: pageSize })
    );

    if (error) {
      throw error;
    }

    const paginatedData = data as PaginatedResponse<V2Indicator>;
    const indicators = (paginatedData.payload || []).map(transformIndicator);
    allIndicators.push(...indicators);

    hasMore = paginatedData.pagination.hasNextPage;
    currentPage++;
  }

  return allIndicators;
}

/**
 * Get indicators by community using V2 API
 * Fetches all pages of results automatically
 */
export const getIndicatorsByCommunity = async (communityId: string) => {
  try {
    return await fetchAllIndicatorPages({ communityUID: communityId });
  } catch (error) {
    errorManager("Error fetching indicators by community", error);
    return [];
  }
};

/**
 * Get grouped indicators by community
 * Note: V2 API doesn't have grouped endpoint, so we fetch all and group by syncType
 * Fetches all pages of results automatically
 */
export const getGroupedIndicatorsByCommunity = async (communityId: string) => {
  try {
    const indicators = await fetchAllIndicatorPages({ communityUID: communityId });

    // Group indicators: auto-synced are system/admin created, manual are project owner created
    return {
      communityAdminCreated: indicators.filter((i) => i.syncType === "auto" || !i.syncType),
      projectOwnerCreated: indicators.filter((i) => i.syncType === "manual"),
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
    const [data, error] = await fetchData(INDEXER.INDICATORS.V2.GET_BY_ID(indicatorId));
    if (error) {
      throw error;
    }
    return transformIndicator(data as V2Indicator);
  } catch (error) {
    errorManager("Error fetching indicator by ID", error);
    return null;
  }
};
