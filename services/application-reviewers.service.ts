import { z } from "zod";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { INDEXER } from "@/utilities/indexer";

/**
 * Assign reviewers to an application request
 */
export interface AssignApplicationReviewersRequest {
  appReviewerAddresses?: string[]; // Program reviewer addresses
  milestoneReviewerAddresses?: string[]; // Milestone reviewer addresses
}

const AssignedReviewersResponseSchema = z
  .object({
    appReviewers: z.array(z.string()).optional(),
    milestoneReviewers: z.array(z.string()).optional(),
  })
  .passthrough();

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
    try {
      await api.put(INDEXER.V2.FUNDING_APPLICATIONS.REVIEWERS(applicationId), request);
    } catch (error) {
      throw new Error(httpErrorMessage(error));
    }
  },

  /**
   * Get assigned reviewers for an application
   */
  async getAssignedReviewers(applicationId: string): Promise<{
    appReviewers: string[];
    milestoneReviewers: string[];
  }> {
    try {
      const data = await api.get<z.infer<typeof AssignedReviewersResponseSchema>>(
        INDEXER.V2.FUNDING_APPLICATIONS.REVIEWERS(applicationId),
        { schema: AssignedReviewersResponseSchema }
      );

      return {
        appReviewers: data?.appReviewers || [],
        milestoneReviewers: data?.milestoneReviewers || [],
      };
    } catch (error) {
      const status = error instanceof HttpError ? error.status : undefined;
      const message = httpErrorMessage(error);

      // Handle "No reviewers found" as empty arrays, not an error
      if (
        status === 404 ||
        message.includes("404") ||
        message.includes("Application Reviewers Not Found") ||
        message.includes("No reviewers found")
      ) {
        return {
          appReviewers: [],
          milestoneReviewers: [],
        };
      }
      // Re-throw other errors
      throw new Error(message || "Failed to fetch reviewers");
    }
  },
};
