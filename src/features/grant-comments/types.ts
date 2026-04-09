export type GrantCommentAuthorRole = "admin" | "reviewer";

export interface GrantComment {
  id: string;
  projectUID: string;
  programId: string;
  authorAddress: string;
  authorRole: GrantCommentAuthorRole;
  authorName?: string;
  content: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  editHistory?: Array<{
    content: string;
    editedAt: string;
    editedBy: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
