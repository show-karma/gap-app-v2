import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import type { ApplicationComment } from "../types";

// TODO(#1775): add zod schema — response shape not yet verified against the
// live BE contract; migrated with the client's untyped escape hatch.

/** Extracts the backend's `message` field (mirrors the legacy fetchData adapter). */
function toErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const bodyMessage = (error.body as { message?: string } | undefined)?.message;
    const causeMessage = (error.cause as { message?: string } | undefined)?.message;
    return bodyMessage || causeMessage || error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export class CommentsService {
  /**
   * Get comments for an application (authenticated)
   */
  static async getComments(applicationId: string): Promise<ApplicationComment[]> {
    try {
      const data = await api.get<{ comments: ApplicationComment[] }>(
        `/v2/applications/${applicationId}/comments`
      );
      return data?.comments ?? [];
    } catch (error) {
      errorManager(`Error fetching comments for application: ${applicationId}`, error);
      return [];
    }
  }

  /**
   * Create a new comment on an application
   */
  static async createComment(applicationId: string, content: string): Promise<ApplicationComment> {
    try {
      const data = await api.post<{ comment: ApplicationComment }>(
        `/v2/applications/${applicationId}/comments`,
        { content }
      );
      return data.comment;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  }

  /**
   * Edit an existing comment
   */
  static async editComment(commentId: string, content: string): Promise<ApplicationComment> {
    try {
      const data = await api.put<{ comment: ApplicationComment }>(`/v2/comments/${commentId}`, {
        content,
      });
      return data.comment;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(commentId: string): Promise<void> {
    try {
      await api.delete(`/v2/comments/${commentId}`);
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  }

  /**
   * Get public comments for an application (no auth required)
   * Returns empty array if flag is disabled (403) or if there are no comments
   */
  static async getPublicComments(referenceNumber: string): Promise<ApplicationComment[]> {
    try {
      const data = await api.get<{ comments: ApplicationComment[] }>(
        `/v2/applications/${referenceNumber}/comments/public`,
        { isAuthorized: false }
      );
      return data?.comments ?? [];
    } catch (error) {
      // A 403 here means the public-comments flag is disabled — an expected,
      // non-actionable outcome, not a failure worth reporting.
      if (error instanceof HttpError && error.status === 403) {
        return [];
      }
      errorManager(`Error fetching public comments for application: ${referenceNumber}`, error);
      return [];
    }
  }

  /**
   * Create a comment on a public application
   * Requires authentication - the backend will assign authorRole: "community"
   */
  static async createPublicComment(
    referenceNumber: string,
    content: string
  ): Promise<ApplicationComment> {
    try {
      const data = await api.post<{ comment: ApplicationComment }>(
        `/v2/applications/${referenceNumber}/comments/public`,
        { content }
      );
      return data.comment;
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  }
}
