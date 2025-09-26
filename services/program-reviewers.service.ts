import axios from "axios";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Create axios instance with authentication
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Program Reviewers API Error:", error.response?.data || error.message);
    throw error;
  }
);

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
 * Reviewer information from API
 */
export interface ProgramReviewerResponse {
  publicAddress: string;
  programId: string;
  chainID: number;
  userProfile: UserProfile;
  assignedAt: string;
  assignedBy?: string;
}

/**
 * Reviewer information for UI
 */
export interface ProgramReviewer {
  publicAddress: string;
  name: string;
  email: string;
  telegram?: string;
  assignedAt: string;
  assignedBy?: string;
}

/**
 * Add reviewer request
 */
export interface AddReviewerRequest {
  publicAddress: string;
  name: string;
  email: string;
  telegram?: string;
}

/**
 * Service for managing program reviewers
 */
export const programReviewersService = {
  /**
   * Get all reviewers for a program
   */
  async getReviewers(programId: string, chainID: number): Promise<ProgramReviewer[]> {
    try {
      const response = await apiClient.get<{ reviewers: ProgramReviewerResponse[] }>(
        `/v2/funding-program-configs/${programId}/${chainID}/reviewers`
      );

      // Map the API response to the expected format
      return (response.data.reviewers || []).map(reviewer => ({
        publicAddress: reviewer.publicAddress,
        name: reviewer.userProfile?.name || '',
        email: reviewer.userProfile?.email || '',
        telegram: reviewer.userProfile?.telegram || '',
        assignedAt: reviewer.assignedAt,
        assignedBy: reviewer.assignedBy
      }));
    } catch (error: any) {
      // Handle "No reviewers found" as an empty list, not an error
      if (error?.response?.data?.error === "Program Reviewer Not Found" ||
          error?.response?.data?.message?.includes("No reviewers found")) {
        return [];
      }
      // Re-throw other errors
      throw error;
    }
  },

  /**
   * Add a reviewer to a program
   */
  async addReviewer(
    programId: string,
    chainID: number,
    reviewerData: AddReviewerRequest
  ): Promise<ProgramReviewer> {
    const response = await apiClient.post<{ reviewer?: ProgramReviewerResponse }>(
      `/v2/funding-program-configs/${programId}/${chainID}/reviewers`,
      reviewerData
    );

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
        assignedBy: undefined
      };
    }

    return {
      publicAddress: reviewer.publicAddress,
      name: reviewer.userProfile?.name || reviewerData.name,
      email: reviewer.userProfile?.email || reviewerData.email,
      telegram: reviewer.userProfile?.telegram || reviewerData.telegram,
      assignedAt: reviewer.assignedAt,
      assignedBy: reviewer.assignedBy
    };
  },

  /**
   * Remove a reviewer from a program
   */
  async removeReviewer(
    programId: string,
    chainID: number,
    publicAddress: string
  ): Promise<void> {
    await apiClient.delete(
      `/v2/funding-program-configs/${programId}/${chainID}/reviewers/${publicAddress}`
    );
  },

  /**
   * Batch add multiple reviewers
   */
  async addMultipleReviewers(
    programId: string,
    chainID: number,
    reviewers: AddReviewerRequest[]
  ): Promise<{ added: ProgramReviewer[]; errors: Array<{ reviewer: AddReviewerRequest; error: string }> }> {
    const addedReviewers: ProgramReviewer[] = [];
    const errors: Array<{ reviewer: AddReviewerRequest; error: string }> = [];

    for (const reviewer of reviewers) {
      try {
        const added = await this.addReviewer(programId, chainID, reviewer);
        addedReviewers.push(added);
      } catch (error) {
        let errorMessage = "Failed to add reviewer";

        if (axios.isAxiosError(error)) {
          errorMessage = error.response?.data?.message || error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        errors.push({
          reviewer,
          error: errorMessage,
        });
      }
    }

    if (errors.length > 0) {
      console.error("Errors adding reviewers:", errors);
    }

    return { added: addedReviewers, errors };
  },

  /**
   * Validate wallet address format
   */
  validateWalletAddress(address: string): boolean {
    // Check if it's a valid Ethereum address
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  },

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate telegram handle format
   */
  validateTelegram(telegram: string): boolean {
    // Telegram usernames are 5-32 characters, alphanumeric and underscores
    // Can optionally start with @
    const telegramRegex = /^@?[a-zA-Z0-9_]{5,32}$/;
    return telegramRegex.test(telegram);
  },

  /**
   * Validate reviewer data before submission
   */
  validateReviewerData(data: AddReviewerRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.publicAddress) {
      errors.push("Wallet address is required");
    } else if (!this.validateWalletAddress(data.publicAddress)) {
      errors.push("Invalid wallet address format");
    }

    if (!data.name) {
      errors.push("Name is required");
    }

    if (!data.email) {
      errors.push("Email is required");
    } else if (!this.validateEmail(data.email)) {
      errors.push("Invalid email format");
    }

    if (data.telegram && !this.validateTelegram(data.telegram)) {
      errors.push("Invalid Telegram handle format");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};