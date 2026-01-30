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
  loginEmail: string;
  notificationEmail?: string;
  privyUserId?: string;
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
  loginEmail: string;
  name: string;
  notificationEmail?: string;
  telegram?: string;
  assignedAt: string;
  assignedBy?: string;
}

/**
 * Add reviewer request - now uses email-based identification
 * Wallet address is generated automatically from loginEmail via Privy
 */
export interface AddReviewerRequest {
  loginEmail: string;
  name: string;
  notificationEmail?: string;
  telegram?: string;
}

/**
 * Service for managing program reviewers
 */
export const programReviewersService = {
  /**
   * Get all reviewers for a program
   */
  async getReviewers(programId: string): Promise<ProgramReviewer[]> {
    const [data, error] = await fetchData<{ reviewers: ProgramReviewerResponse[] }>(
      INDEXER.V2.FUNDING_PROGRAMS.REVIEWERS(programId)
    );

    if (error) {
      // Handle "No reviewers found" as an empty list, not an error
      if (error.includes("Program Reviewer Not Found") || error.includes("No reviewers found")) {
        return [];
      }
      console.error("Program Reviewers API Error:", error);
      throw new Error(error);
    }

    // Map the API response to the expected format
    return (data?.reviewers || []).map((reviewer) => ({
      publicAddress: reviewer.publicAddress,
      loginEmail: reviewer.userProfile?.loginEmail || "",
      name: reviewer.userProfile?.name || "",
      notificationEmail: reviewer.userProfile?.notificationEmail,
      telegram: reviewer.userProfile?.telegram || "",
      assignedAt: reviewer.assignedAt,
      assignedBy: reviewer.assignedBy,
    }));
  },

  /**
   * Add a reviewer to a program
   * Wallet address is generated automatically from loginEmail via Privy
   */
  async addReviewer(programId: string, reviewerData: AddReviewerRequest): Promise<ProgramReviewer> {
    const response = await apiClient.post<{ reviewer?: ProgramReviewerResponse }>(
      INDEXER.V2.FUNDING_PROGRAMS.REVIEWERS(programId),
      reviewerData
    );

    // Map the API response to the expected format
    const reviewer = response.data?.reviewer;

    // Handle case where reviewer might be undefined or API returns success without data
    if (!reviewer) {
      // Return the input data as the reviewer was likely added successfully
      // Note: publicAddress will be assigned by backend via Privy
      return {
        publicAddress: "",
        loginEmail: reviewerData.loginEmail,
        name: reviewerData.name,
        notificationEmail: reviewerData.notificationEmail,
        telegram: reviewerData.telegram,
        assignedAt: new Date().toISOString(),
        assignedBy: undefined,
      };
    }

    return {
      publicAddress: reviewer.publicAddress,
      loginEmail: reviewer.userProfile?.loginEmail || reviewerData.loginEmail,
      name: reviewer.userProfile?.name || reviewerData.name,
      notificationEmail: reviewer.userProfile?.notificationEmail || reviewerData.notificationEmail,
      telegram: reviewer.userProfile?.telegram || reviewerData.telegram,
      assignedAt: reviewer.assignedAt,
      assignedBy: reviewer.assignedBy,
    };
  },

  /**
   * Remove a reviewer from a program by their login email
   */
  async removeReviewer(programId: string, loginEmail: string): Promise<void> {
    await apiClient.delete(
      `/v2/funding-program-configs/${programId}/reviewers/${encodeURIComponent(loginEmail)}`
    );
  },

  /**
   * Batch add multiple reviewers
   */
  async addMultipleReviewers(
    programId: string,
    reviewers: AddReviewerRequest[]
  ): Promise<{
    added: ProgramReviewer[];
    errors: Array<{ reviewer: AddReviewerRequest; error: string }>;
  }> {
    const addedReviewers: ProgramReviewer[] = [];
    const errors: Array<{ reviewer: AddReviewerRequest; error: string }> = [];

    for (const reviewer of reviewers) {
      try {
        const added = await this.addReviewer(programId, reviewer);
        addedReviewers.push(added);
      } catch (error) {
        let errorMessage = "Failed to add reviewer";

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
      console.error("Errors adding reviewers:", errors);
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
   * Validate reviewer data before submission
   * Now uses email-based validation (no wallet address required)
   */
  validateReviewerData(data: {
    loginEmail: string;
    name: string;
    notificationEmail?: string;
    telegram?: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.loginEmail) {
      errors.push("Login email is required");
    } else if (!validateEmail(data.loginEmail)) {
      errors.push("Invalid login email format");
    }

    if (!data.name || !data.name.trim()) {
      errors.push("Name is required");
    }

    if (data.notificationEmail && !validateEmail(data.notificationEmail)) {
      errors.push("Invalid notification email format");
    }

    if (data.telegram && !validateTelegram(data.telegram)) {
      errors.push("Invalid Telegram handle format");
    }

    return { valid: errors.length === 0, errors };
  },
};
