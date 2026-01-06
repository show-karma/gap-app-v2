import axios from "axios";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import {
  validateEmail,
  validateReviewerData as validateReviewerDataUtil,
  validateTelegram,
  validateWalletAddress,
} from "@/utilities/validators";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Keep apiClient for mutations (POST, DELETE)
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

/**
 * User profile information
 */
export interface UserProfile {
  id: string;
  publicAddress: string;
  name: string;
  email: string;
  telegram?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Milestone reviewer information from API
 */
export interface MilestoneReviewerResponse {
  publicAddress: string;
  programId: string;
  chainID: number;
  userProfile: UserProfile;
  assignedAt: string;
  assignedBy?: string;
}

/**
 * Milestone reviewer information for UI
 */
export interface MilestoneReviewer {
  publicAddress: string;
  name: string;
  email: string;
  telegram?: string;
  assignedAt: string;
  assignedBy?: string;
}

/**
 * Add milestone reviewer request
 */
export interface AddMilestoneReviewerRequest {
  publicAddress: string;
  name: string;
  email: string;
  telegram?: string;
}

/**
 * Service for managing milestone reviewers
 */
export const milestoneReviewersService = {
  /**
   * Get all milestone reviewers for a program
   */
  async getReviewers(programId: string): Promise<MilestoneReviewer[]> {
    const [data, error] = await fetchData<MilestoneReviewerResponse[]>(
      INDEXER.V2.MILESTONE_REVIEWERS.LIST(programId)
    );

    if (error) {
      // Handle "No reviewers found" as an empty list, not an error
      if (error.includes("Milestone Reviewer Not Found") || error.includes("No reviewers found")) {
        return [];
      }
      console.error("Milestone Reviewers API Error:", error);
      throw new Error(error);
    }

    // Map the API response to the expected format
    return (data || []).map((reviewer) => ({
      publicAddress: reviewer.publicAddress,
      name: reviewer.userProfile?.name || "",
      email: reviewer.userProfile?.email || "",
      telegram: reviewer.userProfile?.telegram || "",
      assignedAt: reviewer.assignedAt,
      assignedBy: reviewer.assignedBy,
    }));
  },

  /**
   * Add a milestone reviewer to a program
   */
  async addReviewer(
    programId: string,
    reviewerData: AddMilestoneReviewerRequest
  ): Promise<MilestoneReviewer> {
    const response = await apiClient.post<{
      reviewer?: MilestoneReviewerResponse;
    }>(INDEXER.V2.MILESTONE_REVIEWERS.LIST(programId), reviewerData);

    // Map the API response to the expected format
    const reviewer = response.data?.reviewer;

    // Handle case where reviewer might be undefined or API returns success without data
    if (!reviewer) {
      // Return the input data as the reviewer was likely added successfully
      return {
        publicAddress: reviewerData.publicAddress,
        name: reviewerData.name,
        email: reviewerData.email,
        telegram: reviewerData.telegram,
        assignedAt: new Date().toISOString(),
        assignedBy: undefined,
      };
    }

    return {
      publicAddress: reviewer.publicAddress,
      name: reviewer.userProfile?.name || reviewerData.name,
      email: reviewer.userProfile?.email || reviewerData.email,
      telegram: reviewer.userProfile?.telegram || reviewerData.telegram,
      assignedAt: reviewer.assignedAt,
      assignedBy: reviewer.assignedBy,
    };
  },

  /**
   * Remove a milestone reviewer from a program
   */
  async removeReviewer(programId: string, publicAddress: string): Promise<void> {
    await apiClient.delete(
      `/v2/programs/${programId}/milestone-reviewers/${publicAddress}`
    );
  },

  /**
   * Batch add multiple milestone reviewers
   */
  async addMultipleReviewers(
    programId: string,
    reviewers: AddMilestoneReviewerRequest[]
  ): Promise<{
    added: MilestoneReviewer[];
    errors: Array<{ reviewer: AddMilestoneReviewerRequest; error: string }>;
  }> {
    const addedReviewers: MilestoneReviewer[] = [];
    const errors: Array<{
      reviewer: AddMilestoneReviewerRequest;
      error: string;
    }> = [];

    for (const reviewer of reviewers) {
      try {
        const added = await this.addReviewer(programId, reviewer);
        addedReviewers.push(added);
      } catch (error) {
        let errorMessage = "Failed to add milestone reviewer";

        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        }

        errors.push({
          reviewer,
          error: errorMessage,
        });
      }
    }

    if (errors.length > 0) {
      console.error("Errors adding milestone reviewers:", errors);
    }

    return { added: addedReviewers, errors };
  },

  /**
   * Validate wallet address format
   * @deprecated Use validateWalletAddress from @/utilities/validators instead
   */
  validateWalletAddress(address: string): boolean {
    return validateWalletAddress(address);
  },

  /**
   * Validate email format
   * @deprecated Use validateEmail from @/utilities/validators instead
   */
  validateEmail(email: string): boolean {
    return validateEmail(email);
  },

  /**
   * Validate telegram handle format
   * @deprecated Use validateTelegram from @/utilities/validators instead
   */
  validateTelegram(telegram: string): boolean {
    return validateTelegram(telegram);
  },

  /**
   * Validate milestone reviewer data before submission
   * Uses shared validation utilities for consistency
   */
  validateReviewerData(data: AddMilestoneReviewerRequest): {
    valid: boolean;
    errors: string[];
  } {
    return validateReviewerDataUtil(data);
  },
};
