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
    | "milestone"; // Added for milestone field support
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
    applicationDeadline?: string;
    donationRound?: boolean;
    approvalEmailTemplate?: string; // Markdown/HTML template for approval emails with variable placeholders
    approvalEmailSubject?: string; // Custom subject for approval emails with variable placeholders (e.g., {{programName}})
    rejectionEmailTemplate?: string; // Markdown/HTML template for rejection emails with variable placeholders
    rejectionEmailSubject?: string; // Custom subject for rejection emails with variable placeholders (e.g., {{programName}})
  };
}

// V2 Status History Entry
export interface IStatusHistoryEntry {
  status: FundingApplicationStatusV2;
  timestamp: string | Date;
  reason?: string;
}

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

export interface IAIConfig {
  systemPrompt?: string;
  detailedPrompt?: string;
  aiModel?: string;
  enableRealTimeEvaluation?: boolean;
  internalLangfusePromptId?: string;
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

// V2 API Error Response
export interface IFundingPlatformError {
  error: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// Component Props
export interface IFormBuilderProps {
  schema?: IFormSchema;
  onSchemaChange: (schema: IFormSchema) => void;
  disabled?: boolean;
}

export interface IApplicationViewProps {
  application: IFundingApplication;
  onStatusChange?: (
    applicationId: string,
    status: FundingApplicationStatusV2,
    reason?: string
  ) => void;
  isAdmin?: boolean;
}

export interface IApplicationListProps {
  programId: string;
  chainID: number;
  onApplicationSelect?: (application: IFundingApplication) => void;
  onApplicationHover?: (applicationId: string) => void;
  statusFilter?: FundingApplicationStatusV2;
}

// V2 Request/Response Types
export interface IApplicationSubmitRequest {
  programId: string;
  chainID: number;
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

// Export Format Types
export type ExportFormat = "csv" | "json";

// Application Version Types
export interface IFieldChange {
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

// Legacy version interface for backward compatibility during migration
export interface IApplicationVersionLegacy {
  id: string;
  applicationId: string;
  versionNumber: number;
  applicationData: Record<string, any>;
  status: FundingApplicationStatusV2;
  statusHistory: IStatusHistoryEntry[];
  editorAddress?: string;
  editorName?: string;
  editorRole?: "applicant" | "admin" | "reviewer";
  changesSummary?: string;
  createdAt: string | Date;
}

// Internal Component Props (for gradual migration)
export interface IApplicationListComponentProps {
  programId: string;
  chainID: number;
  applications: IFundingApplication[];
  isLoading: boolean;
  onApplicationSelect?: (application: IFundingApplication) => void;
  onStatusChange?: (
    applicationId: string,
    status: string,
    note?: string,
    approvedAmount?: string,
    approvedCurrency?: string
  ) => void;
  showStatusActions?: boolean;
}

// Type conversion helpers
export function isFormSchema(schema: any): boolean {
  return (
    schema &&
    typeof schema === "object" &&
    Array.isArray(schema.fields) &&
    (schema.id === undefined || typeof schema.id === "string") &&
    (schema.title === undefined || typeof schema.title === "string") &&
    (schema.settings === undefined || typeof schema.settings === "object")
  );
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
