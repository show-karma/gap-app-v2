import { INDEXER } from "@/utilities/indexer";
import { envVars } from "@/utilities/enviromentVars";

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
  try {
    const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.V2.APPLICATIONS.COMMENTS(referenceNumber)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // If the endpoint doesn't exist or fails, return empty array
      console.warn(`Failed to fetch comments: ${response.statusText}`);
      return [];
    }

    const data: CommentsResponse = await response.json();
    return data.comments || [];
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
}

export async function createComment(
  referenceNumber: string,
  content: string
): Promise<ApplicationComment> {
  const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.V2.APPLICATIONS.COMMENTS(referenceNumber)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create comment: ${response.statusText}`);
  }

  const data: { comment: ApplicationComment } = await response.json();
  return data.comment;
}

export async function editComment(
  commentId: string,
  content: string
): Promise<ApplicationComment> {
  const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/comments/${commentId}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Failed to edit comment: ${response.statusText}`);
  }

  const data: { comment: ApplicationComment } = await response.json();
  return data.comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/comments/${commentId}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete comment: ${response.statusText}`);
  }
}
