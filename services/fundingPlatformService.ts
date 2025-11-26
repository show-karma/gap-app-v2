import type {
  ExportFormat,
  FundingApplicationStatusV2,
  IApplicationStatistics,
  IApplicationStatusUpdateRequest,
  IApplicationSubmitRequest,
  IApplicationUpdateRequest,
  IApplicationVersion,
  IApplicationVersionTimeline,
  IFormSchema,
  IFundingApplication,
  IFundingProgramConfig,
  IPaginatedApplicationsResponse,
} from "@/types/funding-platform";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

// Base API configuration
const API_BASE = envVars.NEXT_PUBLIC_GAP_INDEXER_URL || "http://localhost:4000";

const apiClient = createAuthenticatedApiClient(API_BASE, 30000);

export interface IApplicationFilters {
  status?: FundingApplicationStatusV2 | string; // Allow string for backward compatibility
  search?: string;
  page?: number;
  limit?: number;
  // Backward compatibility
  dateFrom?: string;
  dateTo?: string;
  // Sorting parameters
  sortBy?:
    | "createdAt"
    | "updatedAt"
    | "status"
    | "applicantEmail"
    | "referenceNumber"
    | "projectTitle"
    | "aiEvaluationScore";
  sortOrder?: "asc" | "desc";
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
  communitySlug?: string;
  communityName?: string;
  communityImage?: string;
  communityUID?: string;
  metrics?: {
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    revisionRequestedApplications?: number;
    underReviewApplications?: number;
  };
  isProgramReviewer?: boolean;
  isMilestoneReviewer?: boolean;
};

// Funding Programs API (V2)
export const fundingProgramsAPI = {
  /**
   * Get all grant programs for a community
   */
  async getProgramsByCommunity(communityId: string): Promise<FundingProgram[]> {
    // First get the configurations
    const configs = await apiClient
      .get<FundingProgram[]>(`/v2/funding-program-configs/community/${communityId}`)
      .catch((error) => {
        console.error("API Error:", error.response?.data || error.message);
        throw error;
      });

    // Transform to FundingProgram format for backward compatibility
    const programs = await Promise.all(
      configs.data.map(async (config) => {
        // Check if stats already exist from backend
        if (config.metrics) {
          // Stats already provided by backend, no need to fetch separately
          return config;
        }

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
  ): Promise<FundingProgram | null> {
    const response = await apiClient.get(
      `/v2/funding-program-configs/${programId}/${chainId.toString()}`
    );
    return response.data;
  },

  /**
   * Get all program configurations with optional community filter
   */
  async getAllProgramConfigs(community?: string): Promise<IFundingProgramConfig[]> {
    const params = community ? `?community=${community}` : "";
    const response = await apiClient.get(`/v2/funding-program-configs${params}`);
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
   * Get only enabled programs (server-side version with Next.js caching)
   * Use this in server components for optimal performance
   */
  async getEnabledProgramsServer(): Promise<FundingProgram[]> {
    const baseURL = API_BASE;
    const response = await fetch(`${baseURL}/v2/funding-program-configs/enabled`, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch enabled programs:", response.statusText);
      return [];
    }

    const programs = (await response.json()) as any[];
    return programs as FundingProgram[];
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
      const existingConfig = await this.getProgramConfiguration(programId, chainId);
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
      const existingConfig = await this.getProgramConfiguration(programId, chainId);
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
  async getProgramStats(programId: string, chainId: number): Promise<IApplicationStatistics> {
    try {
      const stats = await fundingApplicationsAPI.getApplicationStatistics(programId, chainId);
      return stats;
    } catch (error) {
      console.warn(`Failed to fetch stats for program ${programId}:`, error);
      return {
        totalApplications: 0,
        pendingApplications: 0,
        approvedApplications: 0,
        rejectedApplications: 0,
        revisionRequestedApplications: 0,
        underReviewApplications: 0,
      };
    }
  },
};

// Funding Applications API (V2)
export const fundingApplicationsAPI = {
  /**
   * Submit a new funding application
   */
  async submitApplication(request: IApplicationSubmitRequest): Promise<IFundingApplication> {
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
    const response = await apiClient.put(`/v2/funding-applications/${applicationId}`, request);
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
    if (filters.sortBy) params.append("sortBy", filters.sortBy);
    if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

    const response = await apiClient.get(
      `/v2/funding-applications/program/${programId}/${chainId.toString()}?${params}`
    );
    if (!response.data.applications) {
      response.data.applications = [];
      response.data.pagination = {
        page: filters.page || 1,
        limit: filters.limit || 25,
        total: 0,
        totalPages: 0,
      };
    }
    return response.data;
  },

  /**
   * Get a specific application by ID
   */
  async getApplication(applicationId: string): Promise<IFundingApplication> {
    const response = await apiClient.get(`/v2/funding-applications/${applicationId}`);
    return response.data;
  },

  /**
   * Get application by reference number
   */
  async getApplicationByReference(referenceNumber: string): Promise<IFundingApplication> {
    const response = await apiClient.get(`/v2/funding-applications/${referenceNumber}`);
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
  ): Promise<{ data: any; filename?: string }> {
    const params = new URLSearchParams();
    params.append("format", format);

    if (filters.status) params.append("status", filters.status);
    if (filters.search) params.append("search", filters.search);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);
    if (filters.sortBy) params.append("sortBy", filters.sortBy);
    if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

    const response = await apiClient.get(
      `/v2/funding-applications/program/${programId}/${chainId.toString()}/export?${params}`,
      {
        responseType: format === "csv" ? "blob" : "json",
      }
    );

    // Extract filename from Content-Disposition header if available
    const contentDisposition = response.headers["content-disposition"];
    let filename: string | undefined;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch?.[1]) {
        filename = filenameMatch[1].replace(/['"]/g, "");
      }
    }

    return { data: response.data, filename };
  },

  /**
   * Export applications data for admins (full data including private fields)
   */
  async exportApplicationsAdmin(
    programId: string,
    chainId: number,
    format: ExportFormat = "json",
    filters: IApplicationFilters = {}
  ): Promise<{ data: any; filename?: string }> {
    const params = new URLSearchParams();
    params.append("format", format);

    if (filters.status) params.append("status", filters.status);
    if (filters.search) params.append("search", filters.search);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);
    if (filters.sortBy) params.append("sortBy", filters.sortBy);
    if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

    const response = await apiClient.get(
      `/v2/funding-applications/admin/${programId}/${chainId.toString()}/export?${params}`,
      {
        responseType: format === "csv" ? "blob" : "json",
      }
    );

    const contentDisposition = response.headers["content-disposition"];
    let filename: string | undefined;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch?.[1]) {
        filename = filenameMatch[1].replace(/['"]/g, "");
      }
    }

    return { data: response.data, filename };
  },

  /**
   * Get application versions timeline
   * Uses the reference number to get the version history timeline
   */
  async getApplicationVersionsTimeline(referenceNumber: string): Promise<IApplicationVersion[]> {
    const response = await apiClient.get<IApplicationVersionTimeline>(
      `/v2/funding-applications/${referenceNumber}/versions/timeline`
    );
    return response.data.timeline;
  },

  /**
   * Get application versions by application ID (converts to reference number)
   * This maintains backward compatibility with existing code
   */
  async getApplicationVersions(applicationIdOrReference: string): Promise<IApplicationVersion[]> {
    // If it looks like a reference number (APP-XXXXX-XXXXX), use it directly
    if (applicationIdOrReference.startsWith("APP-")) {
      return this.getApplicationVersionsTimeline(applicationIdOrReference);
    }

    // Otherwise, fetch the application to get its reference number
    try {
      const application = await this.getApplication(applicationIdOrReference);
      return this.getApplicationVersionsTimeline(application.referenceNumber);
    } catch (error) {
      console.error("Failed to fetch application versions:", error);
      throw error;
    }
  },

  /**
   * Run AI evaluation on an existing application by reference number (Admin only)
   */
  async runAIEvaluation(referenceNumber: string): Promise<{
    success: boolean;
    referenceNumber: string;
    evaluation: string;
    promptId: string;
    updatedAt: string;
  }> {
    const response = await apiClient.post(`/v2/funding-applications/${referenceNumber}/evaluate`);
    return response.data;
  },
};

// Combined service for easy import
export const fundingPlatformService = {
  programs: fundingProgramsAPI,
  applications: fundingApplicationsAPI,
};

export default fundingPlatformService;
