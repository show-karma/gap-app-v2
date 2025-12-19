import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

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
    const [, error] = await fetchData(
      INDEXER.V2.FUNDING_APPLICATIONS.REVIEWERS(applicationId),
      "PUT",
      request,
      {},
      {},
      true
    );

    if (error) {
      throw new Error(error);
    }
  },

  /**
   * Get assigned reviewers for an application
   */
  async getAssignedReviewers(applicationId: string): Promise<{
    appReviewers: string[];
    milestoneReviewers: string[];
  }> {
    const [data, error, , status] = await fetchData<{
      appReviewers?: string[];
      milestoneReviewers?: string[];
    }>(INDEXER.V2.FUNDING_APPLICATIONS.REVIEWERS(applicationId));

    // Handle "No reviewers found" as empty arrays, not an error
    if (error || status === 404) {
      // Check if it's a "not found" error
      if (
        status === 404 ||
        (typeof error === "string" &&
          (error.includes("404") ||
            error.includes("Application Reviewers Not Found") ||
            error.includes("No reviewers found")))
      ) {
        return {
          appReviewers: [],
          milestoneReviewers: [],
        };
      }
      // Re-throw other errors
      throw new Error(error || "Failed to fetch reviewers");
    }

    return {
      appReviewers: data?.appReviewers || [],
      milestoneReviewers: data?.milestoneReviewers || [],
    };
  },
};
