export type CommentAuthorRole = "applicant" | "admin" | "reviewer" | "community";

export interface ApplicationComment {
  id: string;
  applicationId: string;
  authorAddress: string;
  authorRole: CommentAuthorRole;
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

export interface StatusHistoryItem {
  status: string;
  timestamp: string;
  reason: string;
}

export interface UseApplicationCommentsReturn {
  comments: ApplicationComment[];
  isLoading: boolean;
  error: Error | null;
  isOwner: boolean;
  canComment: boolean;
  canViewComments: boolean;
  addComment: (content: string) => Promise<void>;
  editComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  refetch: () => void;
}

export interface CommentTimelineProps {
  applicationId: string;
  statusHistory: StatusHistoryItem[];
  currentUserAddress?: string | null;
  communityId: string;
}

export interface CommentItemProps {
  comment: ApplicationComment;
  isOwner: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  onDelete: () => Promise<void>;
}

export interface CommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export interface UsePublicCommentingReturn {
  comments: ApplicationComment[];
  isLoading: boolean;
  error: Error | null;

  // Auth state
  isAuthenticated: boolean;
  currentUserAddress: string | null;

  // Actions
  addComment: (content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;

  // Permissions
  canComment: boolean;
  canDeleteComment: (comment: ApplicationComment) => boolean;

  // Mutations state
  isAddingComment: boolean;
  isDeletingComment: boolean;

  // Refetch
  refetch: () => void;
}

export interface PublicCommentItemProps {
  comment: ApplicationComment;
  canDelete: boolean;
  onDelete: (commentId: string) => Promise<void>;
  isDeleting?: boolean;
}
