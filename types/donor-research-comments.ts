import type { CommentAnchor } from "@/src/features/donor-research/components/anchor/types";

/** Public projection — mirrors the backend's read response shape. */
export interface SharedReportComment {
  id: string;
  parentCommentId: string | null;
  isAdvisor: boolean;
  displayName: string;
  anchor: CommentAnchor | null;
  body: string;
  createdAt: string;
}

export interface SharedReportCommentsResponse {
  roots: SharedReportComment[];
  replies: SharedReportComment[];
  pageInfo: { nextCursor: string | null };
}

/** Tree node used by the FE renderer — built client-side from flat lists. */
export interface SharedReportCommentNode extends SharedReportComment {
  children: SharedReportCommentNode[];
  _optimistic?: boolean;
}

export interface CreateCommentRequest {
  parentCommentId?: string;
  anchor?: CommentAnchor;
  body: string;
  displayName: string;
  email?: string;
}

export interface CreateCommentErrorBody {
  error?: string;
  requiresIdentity?: boolean;
  retryAfter?: number;
}

export class IdentityRequiredError extends Error {
  constructor() {
    super("Identity capture required");
    this.name = "IdentityRequiredError";
  }
}

export class RateLimitedError extends Error {
  constructor(public readonly retryAfter: number) {
    super("Rate limited");
    this.name = "RateLimitedError";
  }
}

export class IdempotencyCollisionError extends Error {
  constructor() {
    super("Idempotency key collision — regenerate and retry");
    this.name = "IdempotencyCollisionError";
  }
}
