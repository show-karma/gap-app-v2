import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import type { GrantComment } from "../types";

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

export class GrantCommentsService {
  /**
   * Get comments for a grant (authenticated)
   */
  static async getComments(projectUID: string, programId: string): Promise<GrantComment[]> {
    try {
      const data = await api.get<{ comments: GrantComment[] }>(
        `/v2/grants/${projectUID}/${programId}/comments`
      );
      return data?.comments ?? [];
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  }

  /**
   * Create a new comment on a grant
   */
  static async createComment(
    projectUID: string,
    programId: string,
    content: string
  ): Promise<GrantComment> {
    try {
      const data = await api.post<{ comment: GrantComment }>(
        `/v2/grants/${projectUID}/${programId}/comments`,
        { content }
      );
      if (!data?.comment) throw new Error("Unexpected API response: missing comment");
      return data.comment;
    } catch (error) {
      if (error instanceof Error && error.message === "Unexpected API response: missing comment") {
        throw error;
      }
      throw new Error(toErrorMessage(error));
    }
  }

  /**
   * Edit an existing grant comment
   */
  static async editComment(commentId: string, content: string): Promise<GrantComment> {
    try {
      const data = await api.put<{ comment: GrantComment }>(`/v2/grant-comments/${commentId}`, {
        content,
      });
      if (!data?.comment) throw new Error("Unexpected API response: missing comment");
      return data.comment;
    } catch (error) {
      if (error instanceof Error && error.message === "Unexpected API response: missing comment") {
        throw error;
      }
      throw new Error(toErrorMessage(error));
    }
  }

  /**
   * Delete a grant comment
   */
  static async deleteComment(commentId: string): Promise<void> {
    try {
      await api.delete(`/v2/grant-comments/${commentId}`);
    } catch (error) {
      throw new Error(toErrorMessage(error));
    }
  }
}
