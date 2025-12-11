import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Create axios instance with authentication
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Application Reviewers API Error:", error.response?.data || error.message);
    throw error;
  }
);

/**
 * Assign reviewers to an application request
 */
export interface AssignApplicationReviewersRequest {
  appReviewerAddresses?: string[]; // Program reviewer addresses
  milestoneReviewerAddresses?: string[]; // Milestone reviewer addresses
}

/**
 * Service for managing application reviewers
 */
export const applicationReviewersService = {
  /**
   * Assign reviewers to an application
   */
  async assignReviewers(
    applicationId: string,
    request: AssignApplicationReviewersRequest
  ): Promise<void> {
    await apiClient.put(`/v2/funding-applications/${applicationId}/reviewers`, request);
  },

  /**
   * Get assigned reviewers for an application
   */
  async getAssignedReviewers(applicationId: string): Promise<{
    appReviewers: string[];
    milestoneReviewers: string[];
  }> {
    try {
      const response = await apiClient.get<{
        appReviewers?: string[];
        milestoneReviewers?: string[];
      }>(`/v2/funding-applications/${applicationId}/reviewers`);

      return {
        appReviewers: response.data.appReviewers || [],
        milestoneReviewers: response.data.milestoneReviewers || [],
      };
    } catch (error) {
      // Handle "No reviewers found" as empty arrays, not an error
      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as {
          response?: { status?: number; data?: { error?: string; message?: string } };
        };
        if (
          apiError.response?.status === 404 ||
          apiError.response?.data?.error === "Application Reviewers Not Found" ||
          apiError.response?.data?.message?.includes("No reviewers found")
        ) {
          return {
            appReviewers: [],
            milestoneReviewers: [],
          };
        }
      }
      // Re-throw other errors
      throw error;
    }
  },
};
