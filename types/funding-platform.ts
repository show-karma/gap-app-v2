// V2 Status Types
export type FundingApplicationStatusV2 = 
  | "pending"
  | "under_review"
  | "revision_requested" 
  | "approved"
  | "rejected"
  | "withdrawn";

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
    max?: number;
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
}

// V2 Funding Application
export interface IFundingApplication {
  id: string;
  programId: string;
  chainID: number; // Changed from chainId to chainID to match V2
  applicantEmail: string; // Changed from applicantAddress to applicantEmail
  applicationData: Record<string, any>;
  status: FundingApplicationStatusV2;
  statusHistory: IStatusHistoryEntry[];
  referenceNumber: string; // Format: APP-XXXXX-XXXXX
  submissionIP: string; // Auto-captured from request
  aiEvaluation?: {
    evaluation?: string;
    promptId?: string;
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
  withdrawnApplications?: number;
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

// Internal Component Props (for gradual migration)
export interface IApplicationListComponentProps {
  programId: string;
  chainID: number;
  applications: IFundingApplication[];
  isLoading: boolean;
  onApplicationSelect?: (application: IFundingApplication) => void;
  onStatusChange?: (applicationId: string, status: string, note?: string) => void;
  showStatusActions?: boolean;
}

// Type conversion helpers
export function isFormSchema(schema: any): boolean {
  return schema && 
    typeof schema === 'object' && 
    Array.isArray(schema.fields) &&
    (schema.id === undefined || typeof schema.id === 'string') &&
    (schema.title === undefined || typeof schema.title === 'string') &&
    (schema.settings === undefined || typeof schema.settings === 'object');
}
