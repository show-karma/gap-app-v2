import type { MilestoneStatusEntry } from "@/types/whitelabel-entities";

// V2 Status Types
export type FundingApplicationStatusV2 =
  | "pending"
  | "under_review"
  | "revision_requested"
  | "approved"
  | "rejected"
  | "resubmitted";

// Application Comment Types
export interface ApplicationComment {
  id: string;
  applicationId: string;
  authorAddress: string;
  authorRole: "applicant" | "admin" | "reviewer";
  authorName?: string;
  content: string;
  isDeleted: boolean;
  deletedAt?: string | Date;
  deletedBy?: string;
  editHistory?: Array<{
    content: string;
    editedAt: string | Date;
    editedBy: string;
  }>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Milestone Data Structure
export interface IMilestoneData {
  title: string;
  description: string;
  dueDate: string;
  fundingRequested?: string; // Optional - funding amount requested for this milestone
  completionCriteria?: string; // Optional - criteria to consider milestone complete
  milestoneUID?: string; // Populated by the indexer once the slot is anchored on-chain
}

// Metric Data Structure (pure captured text — not tied to the Indicator system)
export interface IMetricData {
  metric: string;
  dataSource: string;
  howItsMeasured: string;
  target: string;
}

// Form Field Types (unchanged)
export interface IFormField {
  id: string; // Added ID field for V2
  type:
    | "text"
    | "textarea"
    | "number"
    | "email"
    | "url"
    | "select"
    | "checkbox"
    | "radio"
    | "date"
    | "milestone"
    | "metric"
    | "karma_profile_link"
    | "section_header";
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number; // For number fields
    maxLength?: number; // For text/textarea fields (character limit)
    pattern?: string;
    message?: string;
    maxMilestones?: number;
    minMilestones?: number;
    maxMetrics?: number;
    minMetrics?: number;
  };
  description?: string; // Added for question builder
}

// V2 Form Schema - Can be either simple or full schema
export interface IFormSchema {
  id?: string; // For question builder compatibility
  title?: string;
  description?: string;
  fields: IFormField[];
  settings?: {
    submitButtonText?: string;
    confirmationMessage?: string;
    privateApplications?: boolean; // Whether this program has private applications
    donationRound?: boolean; // Whether this is a donation round
    successPageContent?: string; // Markdown content for "What happens next?" section on success page
    showCommentsOnPublicPage?: boolean; // Whether to show comments on public application pages
    approvalEmailTemplate?: string; // Markdown/HTML template for approval emails with variable placeholders
    approvalEmailSubject?: string; // Custom subject for approval emails with variable placeholders (e.g., {{programName}})
    rejectionEmailTemplate?: string; // Markdown/HTML template for rejection emails with variable placeholders
    rejectionEmailSubject?: string; // Custom subject for rejection emails with variable placeholders (e.g., {{programName}})
    accessCodeEnabled?: boolean; // Whether access code gating is enabled (derived from accessCode, read-only for public)
    accessCode?: string; // The access code required to submit the application (only returned for admins)
    kycFormUrl?: string; // Program-specific KYC form URL (overrides community-level)
    kybFormUrl?: string; // Program-specific KYB form URL (overrides community-level)
  };
}

// V2 Status History Entry
export interface IStatusHistoryEntry {
  status: FundingApplicationStatusV2;
  timestamp: string | Date;
  reason?: string;
}

// Status transitions the caller is authorized to trigger on a given application,
// computed server-side from the caller's role in that row's program. The cross-
// program applications-report uses this to gate inline action buttons without
// duplicating the permission matrix on the frontend.
export type ApplicationReportAction = "review" | "request_revision" | "approve" | "reject";

// V2 Funding Program Configuration
export interface IFundingProgramConfig {
  id: string;
  programId: string;
  chainID: number; // Changed from chainId to chainID to match V2
  formSchema: IFormSchema;
  postApprovalFormSchema?: IFormSchema; // Optional post-approval form schema
  systemPrompt?: string;
  detailedPrompt?: string;
  aiModel?: string;
  enableRealTimeEvaluation?: boolean;
  evaluationConfig?: Record<string, any>;
  isEnabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// V2 Funding Application
export interface IFundingApplication {
  id: string;
  programId: string;
  chainID: number; // Changed from chainId to chainID to match V2
  applicantEmail: string; // Changed from applicantAddress to applicantEmail
  ownerAddress: string; // Wallet address of the person who submitted the application
  applicationData: Record<string, any>;
  postApprovalData?: Record<string, any>; // Optional post-approval data
  status: FundingApplicationStatusV2;
  statusHistory: IStatusHistoryEntry[];
  referenceNumber: string; // Format: APP-XXXXX-XXXXX
  submissionIP: string; // Auto-captured from request
  projectUID?: string; // Optional project UID when application is approved
  aiEvaluation?: {
    evaluation?: string;
    promptId?: string;
  };
  internalAIEvaluation?: {
    evaluation?: string;
    promptId?: string;
    evaluatedAt?: string | Date;
  };
  /**
   * Track-record AI evaluation (admin-only). Independent of `internalAIEvaluation`
   * — judges the applicant's delivery history across past Karma grants,
   * milestones, and indicators rather than the proposal itself. Stripped from
   * non-admin API responses by the same sanitizer that hides `internalAIEvaluation`.
   */
  karmaProfileEvaluation?: {
    evaluation?: string;
    promptId?: string;
    evaluatedAt?: string | Date;
    status?: "pending" | "in_progress" | "completed" | "failed" | "skipped";
    context?: string;
    contextHash?: string;
    skipReason?:
      | "no_field_configured"
      | "uid_empty"
      | "uid_invalid"
      | "project_not_found"
      | "aggregator_failed";
  };
  appReviewers?: string[]; // Array of program reviewer addresses assigned to this application
  milestoneReviewers?: string[]; // Array of milestone reviewer addresses assigned to this application
  postApprovalCompleted?: boolean; // Indicates if post-approval form has been completed
  // Server-resolved display name for the project/proposal. Prefers a title
  // from submitted form data; falls back to the linked Karma project's title
  // when the application has a projectUID. Omitted when neither yields a value.
  resolvedProjectName?: string;
  // Server-merged milestone list (application-source slots + project-source
  // grant milestones, pre-deduped by UID and pre-sorted by status/dueDate).
  // Populated by the indexer's attachMilestoneStatuses walker. Empty when
  // projectUID is unset or the linked grant has no milestones yet.
  milestoneStatuses?: MilestoneStatusEntry[];
  // Populated only by the community applications-report endpoint. Undefined
  // elsewhere — callers gating actions outside that page should still use the
  // RBAC <Can> component.
  availableActions?: ApplicationReportAction[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

// V2 Application Statistics
export interface IApplicationStatistics {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  revisionRequestedApplications?: number;
  underReviewApplications?: number;
  resubmittedApplications?: number;
}

export interface IApplicationListProps {
  programId: string;
  chainID?: number; // Optional - V2 endpoints use programId only
  onApplicationSelect?: (application: IFundingApplication) => void;
  onApplicationHover?: (applicationId: string) => void;
  statusFilter?: FundingApplicationStatusV2;
}

// V2 Request/Response Types
export interface IApplicationSubmitRequest {
  programId: string;
  applicantEmail: string;
  applicationData: Record<string, any>;
}

export interface IApplicationUpdateRequest {
  applicationData: Record<string, any>;
}

export interface IApplicationStatusUpdateRequest {
  status: FundingApplicationStatusV2;
  reason: string;
  approvedAmount?: string; // Required when status is "approved"
  approvedCurrency?: string; // Required when status is "approved"
}

export interface IPaginatedApplicationsResponse {
  applications: IFundingApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Unified reviewer-inbox feed item, as returned by
 * GET /v2/funding-applications/community/:communityId/reviewer-inbox.
 * The indexer merges, buckets and sorts both review streams server-side.
 */
export interface IReviewerInboxItem {
  id: string;
  kind: "application" | "milestone";
  bucket: "action" | "waiting" | "done";
  status: string;
  title: string;
  subtitle?: string;
  who?: string;
  project?: string;
  programId: string;
  chainID?: number | null;
  aiScore?: number;
  dueLabel?: string;
  overdue?: boolean;
  activitySort: number;
  referenceNumber?: string;
  projectUid?: string;
  grantUid?: string;
  projectSlug?: string;
  milestoneUid?: string;
}

export interface IReviewerInboxStats {
  action: number;
  waiting: number;
  done: number;
  overdue: number;
  applications: number;
  milestones: number;
}

export interface IReviewerInboxResponse {
  items: IReviewerInboxItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: IReviewerInboxStats;
}

// Export Format Types
export type ExportFormat = "csv" | "json";

// Application Version Types
interface IFieldChange {
  fieldLabel: string;
  changeType: string; // 'added' | 'modified' | 'removed'
  oldValue: string;
  newValue: string;
}

export interface IVersionDiff {
  computedAt: string;
  changedFields: IFieldChange[];
}

export interface IApplicationVersion {
  id: string;
  versionNumber: number;
  submittedBy: string; // Address of the user who submitted this version
  currentStatus: FundingApplicationStatusV2;
  createdAt: string;
  hasChanges: boolean;
  changeCount: number;
  diffFromPrevious?: IVersionDiff;
}

export interface IApplicationVersionTimeline {
  timeline: IApplicationVersion[];
}

/**
 * Type for program prop that supports both IFundingProgramConfig and FormSchema structures.
 * Used in components that need to handle programs from different sources (API vs config).
 */
export type ProgramWithFormSchema =
  | (Partial<IFundingProgramConfig> & {
      formSchema?:
        | IFormSchema
        | {
            fields?: Array<{ id?: string; label?: string }>;
            aiConfig?: {
              internalLangfusePromptId?: string;
              langfusePromptId?: string;
            };
          };
      name?: string;
    })
  | null;
