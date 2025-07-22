import axios from "axios";
import {
  IFormSchema,
  IFundingApplication,
  IFundingProgramConfig,
} from "@/types/funding-platform";

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
  // Add auth token if available (following existing patterns)
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("gap-auth-token")
      : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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

/**
 * Map backend status values to frontend expected values
 */
function mapApplicationStatus(backendStatus: string): string {
  const statusMap: Record<string, string> = {
    pending: "submitted",
    under_review: "under_review",
    approved: "approved",
    rejected: "rejected",
  };
  return statusMap[backendStatus] || backendStatus;
}

/**
 * Map backend application object to frontend expected structure
 */
function mapApplication(app: any): any {
  return {
    ...app,
    chainId: app.chainID, // Map chainID to chainId
    applicantAddress: app.applicantEmail, // Map applicantEmail to applicantAddress
    submittedAt: app.createdAt, // Map createdAt to submittedAt
    status: mapApplicationStatus(app.status), // Map status values
  };
}

export interface IApplicationFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IApplicationsResponse {
  applications: IFundingApplication[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IApplicationStatistics {
  total: number;
  submitted: number;
  under_review: number;
  approved: number;
  rejected: number;
  averageRating?: number;
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
  configuration: IFundingProgramConfig;
  stats: {
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
  };
};

// Funding Programs API
export const fundingProgramsAPI = {
  /**
   * Get all grant programs for a community
   */
  async getProgramsByCommunity(communityId: string): Promise<FundingProgram[]> {
    const response = await apiClient.get(
      `/grant-programs/communities/${communityId}/grant-programs`
    );
    return response.data;
  },

  /**
   * Get program configuration including form schema
   */
  async getProgramConfiguration(
    programId: string,
    chainId: number
  ): Promise<IFundingProgramConfig> {
    const response = await apiClient.get(
      `/grant-programs/${programId}/${chainId}/configuration`
    );
    const data = response.data;

    // Map backend field names to frontend expected names
    return {
      ...data,
      enabled: data.isEnabled, // Map isEnabled to enabled
      chainId: data.chainID || chainId, // Map chainID to chainId
    };
  },

  /**
   * Update program configuration
   */
  async updateProgramConfiguration(
    programId: string,
    chainId: number,
    config: Partial<IFundingProgramConfig>
  ): Promise<IFundingProgramConfig> {
    // Map frontend field names to backend expected names
    const backendConfig = {
      ...config,
      isEnabled: config.isEnabled, // Map enabled to isEnabled
      chainID: config.chainId || chainId, // Map chainId to chainID
    };

    // Remove frontend-specific fields that backend doesn't expect
    delete backendConfig.isEnabled;
    delete backendConfig.chainId;

    const response = await apiClient.put(
      `/grant-programs/${programId}/${chainId}/configuration`,
      backendConfig
    );
    const data = response.data;

    // Map backend field names to frontend expected names
    return {
      ...data,
      enabled: data.isEnabled, // Map isEnabled to enabled
      chainId: data.chainID || chainId, // Map chainID to chainId
    };
  },

  /**
   * Update form schema for a program (React Hook Form)
   */
  async updateFormSchema(
    programId: string,
    chainId: number,
    formSchema: any
  ): Promise<IFundingProgramConfig> {
    // First get existing configuration
    const existingConfig = await this.getProgramConfiguration(
      programId,
      chainId
    );

    // Update with new schema and mark as React Hook Form type
    const updatedConfig = {
      ...existingConfig,
      formSchema: formSchema,
      schemaType: "react-hook-form",
    };

    const response = await apiClient.put(
      `/grant-programs/${programId}/${chainId}/configuration`,
      updatedConfig
    );
    return response.data;
  },

  /**
   * Toggle program status (enabled/disabled)
   */
  async toggleProgramStatus(
    programId: string,
    chainId: number,
    enabled: boolean
  ): Promise<IFundingProgramConfig> {
    const response = await apiClient.put(
      `/grant-programs/${programId}/${chainId}/toggle-status`,
      { isEnabled: enabled }
    );
    const data = response.data;

    // Map backend field names to frontend expected names
    return {
      ...data,
      enabled: data.isEnabled, // Map isEnabled to enabled
      chainId: data.chainID || chainId, // Map chainID to chainId
    };
  },

  /**
   * Get program statistics
   */
  async getProgramStats(programId: string, chainId: number): Promise<any> {
    const response = await apiClient.get(
      `/grant-programs/${programId}/${chainId}/stats`
    );
    return response.data;
  },

  /**
   * Get all enabled programs (public endpoint)
   */
  async getEnabledPrograms(): Promise<any[]> {
    const response = await apiClient.get("/grant-programs/enabled");
    return response.data;
  },
};

// Funding Applications API
export const fundingApplicationsAPI = {
  /**
   * Submit a new funding application
   */
  async submitApplication(
    programId: string,
    chainId: number,
    applicationData: Record<string, any>
  ): Promise<IFundingApplication> {
    // Extract email from form data - there should always be an email field in the form
    let applicantEmail = "";

    // Look for email fields in the form data
    const emailFields = Object.keys(applicationData).filter(
      (key) =>
        key.toLowerCase().includes("email") ||
        (typeof applicationData[key] === "string" &&
          applicationData[key].includes("@"))
    );

    if (emailFields.length > 0) {
      applicantEmail = applicationData[emailFields[0]];
    } else {
      throw new Error("Email field is required in the application form");
    }

    const response = await apiClient.post(
      `/grant-programs/${programId}/${chainId}/applications`,
      {
        applicantEmail,
        applicationData,
      }
    );

    return mapApplication(response.data);
  },

  /**
   * Get applications for a program with filtering and pagination
   */
  async getApplications(
    programId: string,
    chainId: number,
    filters: IApplicationFilters = {}
  ): Promise<IApplicationsResponse> {
    const params = new URLSearchParams();

    if (filters.status) params.append("status", filters.status);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);
    if (filters.search) params.append("search", filters.search);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());

    const response = await apiClient.get(
      `/grant-programs/${programId}/${chainId}/applications?${params}`
    );
    const data = response.data;

    // Map backend response structure to frontend expected structure
    const mappedApplications = (data.applications || []).map(mapApplication);

    return {
      applications: mappedApplications,
      total: data.pagination?.total || 0,
      page: data.pagination?.page || 1,
      totalPages: data.pagination?.totalPages || 1,
    };
  },

  /**
   * Get a specific application by ID
   */
  async getApplication(applicationId: string): Promise<IFundingApplication> {
    const response = await apiClient.get(
      `/grant-programs/applications/${applicationId}`
    );

    return mapApplication(response.data);
  },

  /**
   * Update application status
   */
  async updateApplicationStatus(
    applicationId: string,
    status: string,
    note?: string
  ): Promise<IFundingApplication> {
    const response = await apiClient.put(
      `/grant-programs/applications/${applicationId}/status`,
      {
        status,
        note,
      }
    );

    return mapApplication(response.data);
  },

  /**
   * Get application statistics for a program
   */
  async getApplicationStatistics(
    programId: string,
    chainId: number
  ): Promise<IApplicationStatistics> {
    const response = await apiClient.get(
      `/grant-programs/${programId}/${chainId}/applications/statistics`
    );
    return response.data;
  },

  /**
   * Export applications data
   */
  async exportApplications(
    programId: string,
    chainId: number,
    format: "json" | "csv" = "json",
    filters: IApplicationFilters = {}
  ): Promise<any> {
    const params = new URLSearchParams();
    params.append("format", format);

    if (filters.status) params.append("status", filters.status);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);
    if (filters.search) params.append("search", filters.search);

    const response = await apiClient.get(
      `/grant-programs/${programId}/${chainId}/applications/export?${params}`
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
