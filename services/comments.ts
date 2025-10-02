import { INDEXER } from "@/utilities/indexer";
import { envVars } from "@/utilities/enviromentVars";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

export interface ApplicationComment {
  id: string;
  content: string;
  authorAddress: string;
  authorName?: string;
  authorRole?: "admin" | "user";
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  editHistory?: Array<{ content: string; editedAt: string }>;
}

export interface CommentsResponse {
  comments: ApplicationComment[];
}

export async function fetchApplicationComments(
  referenceNumber: string
): Promise<ApplicationComment[]> {
  const response = await apiClient.get<CommentsResponse>(
    INDEXER.V2.APPLICATIONS.COMMENTS(referenceNumber)
  );
  return response.data.comments || [];
}

export async function createComment(
  referenceNumber: string,
  content: string
): Promise<ApplicationComment> {
  const response = await apiClient.post<{ comment: ApplicationComment }>(
    INDEXER.V2.APPLICATIONS.COMMENTS(referenceNumber),
    { content }
  );
  return response.data.comment;
}

export async function editComment(
  commentId: string,
  content: string
): Promise<ApplicationComment> {
  const response = await apiClient.put<{ comment: ApplicationComment }>(
    `/v2/comments/${commentId}`,
    { content }
  );
  return response.data.comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiClient.delete(`/v2/comments/${commentId}`);
}
