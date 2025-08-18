import axios from "axios";
import {
  IFormSchema,
  IFundingApplication,
  IFundingProgramConfig,
  IApplicationSubmitRequest,
  IApplicationUpdateRequest,
  IApplicationStatusUpdateRequest,
  IPaginatedApplicationsResponse,
  IApplicationStatistics,
  ExportFormat,
  FundingApplicationStatusV2,
} from "@/types/funding-platform";
import { getCookiesFromStoredWallet } from "@/utilities/getCookiesFromStoredWallet";

// Base API configuration
const API_BASE =
  process.env.NEXT_PUBLIC_GAP_INDEXER_URL || "http://localhost:4000";

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  // Get auth token from cookies using address-specific key
  const { token } = getCookiesFromStoredWallet();
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    throw error;
  }
);

export interface IApplicationFilters {
  status?: FundingApplicationStatusV2 | string; // Allow string for backward compatibility
  search?: string;
  page?: number;
  limit?: number;
  // Backward compatibility
  dateFrom?: string;
  dateTo?: string;
}

export type FundingProgram = {
  programId: string;
  chainID: number;
  name: string;
  metadata: {
    tags?: string[];
    type?: string;
    title?: string;
    logoImg?: string;
    website?: string;
    startsAt?: string;
    endsAt?: string;
    socialLinks?: {
      blog?: string;
      forum?: string;
      twitter?: string;
      discord?: string;
      website?: string;
      orgWebsite?: string;
      grantsSite?: string;
      telegram?: string;
    };
    bugBounty?: string;
    bounties?: string[];
    bannerImg?: string;
    createdAt?: number;
    minGrantSize?: string;
    maxGrantSize?: string;
    categories?: string[];
    ecosystems?: string[];
    organizations?: string[];
    networks?: string[];
    grantTypes?: string[];
    credentials?: {};
    description?: string;
    logoImgData?: string;
    grantsToDate?: number;
    bannerImgData?: string;
    programBudget?: string;
    projectTwitter?: string;
    applicantsNumber?: number;
    amountDistributedToDate?: string;
    platformsUsed?: string[];
    status: string;
    communityRef?: string[];
  };
  applicationConfig: IFundingProgramConfig;
  metrics?: {
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    revisionRequestedApplications?: number;
  };
};

// Funding Programs API (V2)
export const fundingProgramsAPI = {
  /**
   * Get all grant programs for a community
   */
  async getProgramsByCommunity(communityId: string): Promise<FundingProgram[]> {
    // First get the configurations
    const configs = await apiClient.get<FundingProgram[]>(
      `/v2/funding-program-configs/community/${communityId}`
    );

    // Transform to FundingProgram format for backward compatibility
    const programs = await Promise.all(
      configs.data.map(async (config) => {
        // Check if stats already exist from backend
        if (config.metrics) {
          // Stats already provided by backend, no need to fetch separately
          return config;
        }

        // // Fallback: Get statistics for each program if not provided by backend
        // let stats = {
        //   totalApplications: 0,
        //   pendingApplications: 0,
        //   approvedApplications: 0,
        //   rejectedApplications: 0,
        //   revisionRequestedApplications: 0,
        // };

        // try {
        //   const statsResponse = await fundingApplicationsAPI.getApplicationStatistics(
        //     config.programId,
        //     config.chainID
        //   );
        //   console.log("statsResponse", statsResponse);
        //   stats = {
        //     totalApplications: statsResponse.totalApplications,
        //     pendingApplications: statsResponse.pendingApplications,
        //     approvedApplications: statsResponse.approvedApplications,
        //     rejectedApplications: statsResponse.rejectedApplications,
        //     revisionRequestedApplications: statsResponse.revisionRequestedApplications || 0,
        //   };
        // } catch (error) {
        //   console.warn(`Failed to fetch stats for program ${config.programId}:`, error);
        // }

        return {
          ...config,
          // stats,
        };
      })
    );

    return programs;
  },

  /**
   * Get program configuration including form schema
   */
  async getProgramConfiguration(
    programId: string,
    chainId: number
  ): Promise<IFundingProgramConfig | null> {
    const response = await apiClient.get(
      `/v2/funding-program-configs/${programId}/${chainId.toString()}`
    );
    return response.data?.applicationConfig;
  },

  /**
   * Get all program configurations with optional community filter
   */
  async getAllProgramConfigs(
    community?: string
  ): Promise<IFundingProgramConfig[]> {
    const params = community ? `?community=${community}` : "";
    const response = await apiClient.get(
      `/v2/funding-program-configs${params}`
    );
    return response.data;
  },

  /**
   * Get only enabled programs
   */
  async getEnabledPrograms(): Promise<IFundingProgramConfig[]> {
    const response = await apiClient.get("/v2/funding-program-configs/enabled");
    return response.data;
  },

  /**
   * Update program configuration (uses POST for new configs, PUT for updates)
   */
  async createProgramConfiguration(
    programId: string,
    chainId: number,
    config: Partial<IFundingProgramConfig | null>
  ): Promise<IFundingProgramConfig> {
    // If config exists, use POST to update
    const response = await apiClient.post(
      `/v2/funding-program-configs/${programId}/${chainId.toString()}`,
      config
    );
    return response.data;
  },

  /**
   * Update program configuration (uses POST for new configs, PUT for updates)
   */
  async updateProgramConfiguration(
    programId: string,
    chainId: number,
    config: Partial<IFundingProgramConfig | null>
  ): Promise<IFundingProgramConfig> {
    // If config exists, use PUT to update
    const response = await apiClient.put(
      `/v2/funding-program-configs/${programId}/${chainId.toString()}`,
      config
    );
    return response.data;
  },

  /**
   * Update form schema for a program
   */
  async updateFormSchema(
    programId: string,
    chainId: number,
    formSchema: IFormSchema
  ): Promise<IFundingProgramConfig> {
    try {
      const existingConfig = await this.getProgramConfiguration(
        programId,
        chainId
      );
      const updatedConfig = {
        ...existingConfig,
        formSchema: formSchema,
      };

      // Use updateProgramConfiguration which handles POST/PUT logic
      return this.updateProgramConfiguration(programId, chainId, updatedConfig);
    } catch (error: any) {
      // If config doesn't exist, create new one with formSchema
      if (error.response?.status === 404 || !error.response) {
        return this.updateProgramConfiguration(programId, chainId, {
          formSchema,
        });
      }
      throw error;
    }
  },

  /**
   * Toggle program status (enabled/disabled)
   */
  async toggleProgramStatus(
    programId: string,
    chainId: number,
    enabled: boolean
  ): Promise<IFundingProgramConfig> {
    try {
      const existingConfig = await this.getProgramConfiguration(
        programId,
        chainId
      );
      return this.updateProgramConfiguration(programId, chainId, {
        ...existingConfig,
        isEnabled: enabled,
      });
    } catch (error: any) {
      // If config doesn't exist, create new one with enabled status
      if (error.response?.status === 404 || !error.response) {
        return this.updateProgramConfiguration(programId, chainId, {
          isEnabled: enabled,
        });
      }
      throw error;
    }
  },

  /**
   * Get program statistics (backward compatibility)
   */
  async getProgramStats(
    programId: string,
    chainId: number
  ): Promise<IApplicationStatistics> {
    try {
      const stats = await fundingApplicationsAPI.getApplicationStatistics(
        programId,
        chainId
      );
      return stats;
    } catch (error) {
      console.warn(`Failed to fetch stats for program ${programId}:`, error);
      return {
        totalApplications: 0,
        pendingApplications: 0,
        approvedApplications: 0,
        rejectedApplications: 0,
        revisionRequestedApplications: 0,
      };
    }
  },
};

// Funding Applications API (V2)
export const fundingApplicationsAPI = {
  /**
   * Submit a new funding application
   */
  async submitApplication(
    request: IApplicationSubmitRequest
  ): Promise<IFundingApplication> {
    const response = await apiClient.post(
      `/v2/funding-applications/${request.programId}/${request.chainID.toString()}`,
      request
    );
    return response.data;
  },

  /**
   * Update an existing application (for users)
   */
  async updateApplication(
    applicationId: string,
    request: IApplicationUpdateRequest
  ): Promise<IFundingApplication> {
    const response = await apiClient.put(
      `/v2/funding-applications/${applicationId}`,
      request
    );
    return response.data;
  },

  /**
   * Update application status (for admins)
   */
  async updateApplicationStatus(
    applicationId: string,
    request: IApplicationStatusUpdateRequest
  ): Promise<IFundingApplication> {
    const response = await apiClient.put(
      `/v2/funding-applications/${applicationId}/status`,
      request
    );
    return response.data;
  },

  /**
   * Get applications for a program with filtering and pagination
   */
  async getApplicationsByProgram(
    programId: string,
    chainId: number,
    filters: IApplicationFilters = {}
  ): Promise<IPaginatedApplicationsResponse> {
    const params = new URLSearchParams();

    if (filters.status) params.append("status", filters.status);
    if (filters.search) params.append("search", filters.search);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);

    const response = await apiClient.get(
      `/v2/funding-applications/program/${programId}/${chainId.toString()}?${params}`
    );
    return response.data;
  },

  /**
   * Get a specific application by ID
   */
  async getApplication(applicationId: string): Promise<IFundingApplication> {
    const response = await apiClient.get(
      `/v2/funding-applications/${applicationId}`
    );
    return response.data;
  },

  /**
   * Get application by reference number
   */
  async getApplicationByReference(
    referenceNumber: string
  ): Promise<IFundingApplication> {
    const response = await apiClient.get(
      `/v2/funding-applications/reference/${referenceNumber}`
    );
    return response.data;
  },

  /**
   * Get application by email and program
   */
  async getApplicationByEmail(
    programId: string,
    chainId: number,
    email: string
  ): Promise<IFundingApplication | null> {
    try {
      const response = await apiClient.get(
        `/v2/funding-applications/program/${programId}/${chainId.toString()}/by-email?email=${encodeURIComponent(
          email
        )}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get application statistics for a program
   */
  async getApplicationStatistics(
    programId: string,
    chainId: number
  ): Promise<IApplicationStatistics> {
    const response = await apiClient.get(
      `/v2/funding-applications/program/${programId}/${chainId.toString()}/statistics`
    );

    return response.data;
  },

  /**
   * Export applications data
   */
  async exportApplications(
    programId: string,
    chainId: number,
    format: ExportFormat = "json",
    filters: IApplicationFilters = {}
  ): Promise<any> {
    const params = new URLSearchParams();
    params.append("format", format);

    if (filters.status) params.append("status", filters.status);
    if (filters.search) params.append("search", filters.search);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);

    const response = await apiClient.get(
      `/v2/funding-applications/program/${programId}/${chainId.toString()}/export?${params}`,
      {
        responseType: format === "csv" ? "blob" : "json",
      }
    );
    return response.data;
  },

  /**
   * Export applications data for admins (full data including private fields)
   */
  async exportApplicationsAdmin(
    programId: string,
    chainId: number,
    format: ExportFormat = "json",
    filters: IApplicationFilters = {}
  ): Promise<any> {
    const params = new URLSearchParams();
    params.append("format", format);

    if (filters.status) params.append("status", filters.status);
    if (filters.search) params.append("search", filters.search);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);

    const response = await apiClient.get(
      `/v2/funding-applications/admin/${programId}/${chainId.toString()}/export?${params}`,
      {
        responseType: format === "csv" ? "blob" : "json",
      }
    );
    return response.data;
  },

  /**
   * Real-time AI evaluation of partial application data
   */
  async evaluateRealTime(
    programId: string,
    chainId: number,
    applicationData: Record<string, any>
  ): Promise<{
    success: boolean;
    data: {
      rating: number;
      feedback: string;
      suggestions: string[];
      isComplete: boolean;
      evaluatedAt: string;
      model: string;
    };
  }> {
    const response = await apiClient.post(
      `/v2/funding-applications/${programId}/${chainId.toString()}/evaluate-realtime`,
      { applicationData }
    );
    return response.data;
  },
};

// Combined service for easy import
export const fundingPlatformService = {
  programs: fundingProgramsAPI,
  applications: fundingApplicationsAPI,
};

export default fundingPlatformService;
