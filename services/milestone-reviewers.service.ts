import axios from "axios";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";
import {
  validateEmail,
  validateReviewerData as validateReviewerDataUtil,
  validateTelegram,
} from "@/utilities/validators";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

// Keep apiClient for mutations (POST, DELETE)
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

/**
 * Extracts the same human-readable error message the legacy `fetchData`
 * adapter surfaced for an `HttpError`: prefer the server response body's
 * `message`, then the original axios error's message, then the client's
 * synthetic message. Falls back to a plain `Error.message` (or
 * `String(error)`) for non-HTTP `ApiError`s.
 */
function httpErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const bodyMessage = (error.body as { message?: string } | undefined)?.message;
    const causeMessage = (error.cause as { message?: string } | undefined)?.message;
    return bodyMessage || causeMessage || error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * User profile information
 */
export interface UserProfile {
  id: string;
  publicAddress: string;
  name: string;
  email: string;
  telegram?: string;
  slack?: string;
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
  publicAddress?: string;
  name: string;
  email: string;
  telegram?: string;
  slack?: string;
  assignedAt: string;
  assignedBy?: string;
}

/**
 * Add milestone reviewer request
 */
export interface AddMilestoneReviewerRequest {
  name: string;
  email: string;
  telegram?: string;
  slack?: string;
}

/**
 * Update milestone reviewer contact request (PATCH by email)
 */
export interface UpdateMilestoneReviewerContactRequest {
  email: string;
  telegram?: string;
  slack?: string;
}

/**
 * Service for managing milestone reviewers
 */
export const milestoneReviewersService = {
  /**
   * Get all milestone reviewers for a program
   */
  async getReviewers(programId: string): Promise<MilestoneReviewer[]> {
    let data: MilestoneReviewerResponse[] | null;
    try {
      // TODO(#1775): add zod schema
      data = await api.get<MilestoneReviewerResponse[]>(
        INDEXER.V2.MILESTONE_REVIEWERS.LIST(programId)
      );
    } catch (error) {
      // A program with no reviewers is an empty list, not a failure. The
      // backend signals this with a 404 (list resource not found); some
      // deployments also phrase it in the body message. Match on the status
      // first so we don't depend on exact copy, then keep the message checks
      // for backends that return a non-404 "not found". Only a genuine error
      // (500, network, etc.) surfaces to the caller.
      const errorMessage = httpErrorMessage(error);
      if (
        (error instanceof HttpError && error.status === 404) ||
        errorMessage.includes("Milestone Reviewer Not Found") ||
        errorMessage.includes("No reviewers found")
      ) {
        return [];
      }
      console.error("Milestone Reviewers API Error:", error);
      throw new Error(errorMessage);
    }

    // Map the API response to the expected format
    return (data || []).map((reviewer) => ({
      publicAddress: reviewer.publicAddress,
      name: reviewer.userProfile?.name || "",
      email: reviewer.userProfile?.email || "",
      telegram: reviewer.userProfile?.telegram || "",
      slack: reviewer.userProfile?.slack || "",
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
    // publicAddress is resolved server-side via Privy; unavailable in fallback
    if (!reviewer) {
      return {
        name: reviewerData.name,
        email: reviewerData.email,
        telegram: reviewerData.telegram,
        slack: reviewerData.slack,
        assignedAt: new Date().toISOString(),
        assignedBy: undefined,
      };
    }

    return {
      publicAddress: reviewer.publicAddress,
      name: reviewer.userProfile?.name || reviewerData.name,
      email: reviewer.userProfile?.email || reviewerData.email,
      telegram: reviewer.userProfile?.telegram || reviewerData.telegram,
      slack: reviewer.userProfile?.slack || reviewerData.slack,
      assignedAt: reviewer.assignedAt,
      assignedBy: reviewer.assignedBy,
    };
  },

  /**
   * Remove a milestone reviewer from a program by email
   */
  async removeReviewer(programId: string, email: string): Promise<void> {
    await apiClient.delete(`/v2/programs/${programId}/milestone-reviewers/by-email`, {
      data: { email },
    });
  },

  /**
   * Update milestone reviewer contact fields (telegram/slack) by email
   */
  async updateReviewerContact(
    programId: string,
    patch: UpdateMilestoneReviewerContactRequest
  ): Promise<void> {
    await apiClient.patch(`/v2/programs/${programId}/milestone-reviewers/by-email`, patch);
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
  validateReviewerData(data: AddMilestoneReviewerRequest) {
    return validateReviewerDataUtil(data);
  },
};
