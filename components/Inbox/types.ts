/** The two review streams a Reviewer Inbox unifies. */
export type InboxKind = "application" | "milestone";

/**
 * Priority grouping for an Inbox item, framed by who must act next.
 * See CONTEXT.md › Review bucket.
 */
export type ReviewBucket = "action" | "waiting" | "done";

/**
 * A Reviewer Inbox row, as returned by the unified server feed
 * (GET /v2/funding-applications/community/:communityId/reviewer-inbox).
 *
 * The indexer merges, buckets and sorts both streams (applications and
 * milestone verifications) server-side, so this is a flat presentational shape.
 * Detail panes open from the identifier fields below rather than a full payload.
 */
export interface InboxItem {
  /** Stable id: application reference number, or milestone uid. */
  id: string;
  kind: InboxKind;
  bucket: ReviewBucket;
  /** Raw status from the source domain (application or milestone status). */
  status: string;
  title: string;
  subtitle?: string;
  /** Applicant email (applications) — who submitted. */
  who?: string;
  /** Project title (milestones). */
  project?: string;
  programId: string;
  /** Applications only: the chain the program is attested on. */
  chainID?: number | null;
  /** AI score/rating, when available (applications). */
  aiScore?: number;
  /** Milestones only: due date label + overdue flag. */
  dueLabel?: string;
  overdue?: boolean;
  /** Epoch ms used to order items within a bucket (recent first). */
  activitySort: number;

  /** Applications only: ISO submitted (created) + last-updated timestamps. */
  submittedAt?: string;
  updatedAt?: string;

  /** Applications only: detail id for ApplicationDetailView. */
  referenceNumber?: string;

  /** Milestones only: identifiers for InboxMilestoneDetail. */
  projectUid?: string;
  grantUid?: string;
  projectSlug?: string;
  milestoneUid?: string;
}

/** The 3 stat counters shown in the Inbox header. */
export interface InboxStats {
  action: number;
  waiting: number;
  done: number;
  overdue: number;
  applications: number;
  milestones: number;
}
