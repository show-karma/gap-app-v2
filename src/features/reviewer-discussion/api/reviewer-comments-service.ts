import type { ApplicationComment } from "@/types/funding-platform";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

const { REVIEWER_COMMENTS, REVIEWER_COMMENT } = INDEXER.V2.APPLICATIONS;

export async function getReviewerComments(referenceNumber: string): Promise<ApplicationComment[]> {
  // TODO(#1775): add zod schema
  const data = await api.get<{ comments: ApplicationComment[] }>(
    REVIEWER_COMMENTS(referenceNumber)
  );
  return data?.comments ?? [];
}

export async function createReviewerComment(
  referenceNumber: string,
  content: string
): Promise<ApplicationComment> {
  const data = await api.post<{ comment: ApplicationComment }>(REVIEWER_COMMENTS(referenceNumber), {
    content,
  });
  if (!data) throw new Error("Failed to post comment");
  return data.comment;
}

export async function editReviewerComment(
  referenceNumber: string,
  commentId: string,
  content: string
): Promise<ApplicationComment> {
  const data = await api.put<{ comment: ApplicationComment }>(
    REVIEWER_COMMENT(referenceNumber, commentId),
    { content }
  );
  if (!data) throw new Error("Failed to edit comment");
  return data.comment;
}

export async function deleteReviewerComment(
  referenceNumber: string,
  commentId: string
): Promise<void> {
  await api.delete(REVIEWER_COMMENT(referenceNumber, commentId));
}
