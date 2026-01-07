import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { FUNDING_MAP_DEFAULT_CHAIN_ID, FUNDING_MAP_PAGE_SIZE } from "../constants/filter-options";
import type {
  FetchFundingProgramsParams,
  FundingProgramResponse,
  OrganizationFiltersResponse,
  PaginatedFundingPrograms,
  PaginatedFundingProgramsResponse,
} from "../types/funding-program";
import { buildQueryString } from "../utils/mappers";

/**
 * Service for fetching funding programs from the API
 */
export const fundingProgramsService = {
  /**
   * Fetch all funding programs with filters and pagination
   */
  async getAll(params: FetchFundingProgramsParams = {}): Promise<PaginatedFundingPrograms> {
    const pageSize = params.pageSize || FUNDING_MAP_PAGE_SIZE;
    const page = params.page || 1;

    const queryString = buildQueryString({
      ...params,
      page,
      pageSize,
    });

    const [response, error] = await fetchData<PaginatedFundingProgramsResponse>(
      `${INDEXER.V2.REGISTRY.GET_ALL}${queryString}`
    );

    if (error) {
      throw new Error(error);
    }

    if (!response) {
      return {
        programs: [],
        count: 0,
        totalPages: 0,
      };
    }

    return {
      programs: response.programs,
      count: response.count,
      totalPages: response.totalPages,
    };
  },

  /**
   * Fetch a single funding program by ID
   */
  async getById(programId: string): Promise<FundingProgramResponse | null> {
    const [data, error] = await fetchData<FundingProgramResponse>(
      INDEXER.V2.REGISTRY.GET_BY_ID(programId)
    );

    if (error || !data) {
      return null;
    }

    return data;
  },

  /**
   * Parse a program ID that may contain chain ID (for backward compatibility)
   * Format: "programId" (preferred) or "programId_chainId" (legacy)
   * Splits on the LAST underscore to support program IDs containing underscores
   */
  parseProgramIdAndChainId(
    id: string,
    defaultChainId: number = FUNDING_MAP_DEFAULT_CHAIN_ID
  ): { programId: string; chainId: number } {
    const lastUnderscoreIndex = id.lastIndexOf("_");

    if (lastUnderscoreIndex !== -1) {
      const potentialChainIdStr = id.substring(lastUnderscoreIndex + 1);
      const potentialChainId = parseInt(potentialChainIdStr, 10);

      // Only split if what follows the last underscore is a valid numeric chainId
      if (!Number.isNaN(potentialChainId) && potentialChainIdStr === String(potentialChainId)) {
        return {
          programId: id.substring(0, lastUnderscoreIndex),
          chainId: potentialChainId,
        };
      }
    }

    return {
      programId: id,
      chainId: defaultChainId,
    };
  },

  /**
   * Fetch organization and community filters for the funding map
   * Returns organizations and communities that have programs, sorted by program count
   */
  async getOrganizationFilters(): Promise<OrganizationFiltersResponse> {
    const [response, error] = await fetchData<OrganizationFiltersResponse>(
      INDEXER.V2.REGISTRY.GET_FILTERS
    );

    if (error) {
      throw new Error(error);
    }

    return response || { options: [] };
  },
};
