// Ported from gap-whitelabel-app — local type definitions for whitelabel features.
// These types mirror the gap-indexer V2 API responses used by the whitelabel app.

export type TenantId = string;

// Status types
export type ApplicationStatus =
  | "draft"
  | "pending"
  | "under_review"
  | "revision_requested"
  | "approved"
  | "rejected"
  | "resubmitted";

export type ProgramStatus = "upcoming" | "active" | "ended";

// Application form configuration
export interface ApplicationQuestion {
  id: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "multiselect"
    | "file"
    | "number"
    | "date"
    | "milestone"
    | "checkbox"
    | "radio"
    | "url"
    | "email"
    | "karma_profile_link";
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    maxLength?: number;
    fileTypes?: string[];
    maxFileSize?: number;
    maxMilestones?: number;
    minMilestones?: number;
  };
}

export interface MilestoneData {
  title: string;
  description: string;
  dueDate: string;
  fundingRequested?: string;
  completionCriteria?: string;
}

export interface ApplicationConfig {
  questions: ApplicationQuestion[];
  requiresAIEvaluation?: boolean;
  aiEvaluationCriteria?: string[];
  multiStep?: boolean;
  steps?: Array<{
    id: string;
    title: string;
    questionIds: string[];
  }>;
}

// AI Evaluation result
export interface AIEvaluation {
  score: number;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  evaluatedAt: string;
}

// Form schema types (from gap-indexer V2)
export interface IFormField {
  id: string;
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
    | "karma_profile_link";
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
    maxLength?: number;
    fileTypes?: string[];
    maxFileSize?: number;
    maxMilestones?: number;
    minMilestones?: number;
  };
  description?: string;
  aiEvaluation?: {
    triggerOnChange?: boolean;
    includeInEvaluation?: boolean;
  };
  private?: boolean;
}

export interface IFormSchema {
  id?: string;
  title?: string;
  description?: string;
  fields: IFormField[];
  settings?: {
    submitButtonText?: string;
    confirmationMessage?: string;
    privateApplications?: boolean;
    donationRound?: boolean;
    successPageContent?: string;
    showCommentsOnPublicPage?: boolean;
    accessCodeEnabled?: boolean;
    accessCode?: string;
  };
  aiConfig?: {
    systemPrompt?: string;
    detailedPrompt?: string;
    aiModel?: string;
    enableRealTimeEvaluation?: boolean;
  };
}

// V2 Funding Program Configuration
export interface FundingProgramConfig {
  id?: string;
  programId?: string;
  chainID?: number;
  formSchema?: IFormSchema;
  postApprovalFormSchema?: IFormSchema;
  systemPrompt?: string;
  detailedPrompt?: string;
  aiModel?: string;
  enableRealTimeEvaluation?: boolean;
  evaluationConfig?: Record<string, unknown>;
  isEnabled: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Core funding program entity (mirrors gap-indexer V2 response)
export interface FundingProgram {
  id?: string;
  programId: string;
  chainID: number;
  name: string;
  metadata: {
    tags?: string[];
    type?: string;
    title?: string;
    logoImg?: string;
    website?: string;
    startsAt?: string;
    endsAt?: string;
    socialLinks?: {
      blog?: string;
      forum?: string;
      twitter?: string;
      discord?: string;
      website?: string;
      orgWebsite?: string;
      grantsSite?: string;
      telegram?: string;
    };
    bugBounty?: string;
    bounties?: string[];
    bannerImg?: string;
    createdAt?: number;
    minGrantSize?: string;
    maxGrantSize?: string;
    categories?: string[];
    ecosystems?: string[];
    organizations?: string[];
    networks?: string[];
    grantTypes?: string[];
    credentials?: Record<string, unknown>;
    description?: string;
    logoImgData?: string;
    grantsToDate?: number;
    bannerImgData?: string;
    programBudget?: string;
    projectTwitter?: string;
    applicantsNumber?: number;
    amountDistributedToDate?: string;
    platformsUsed?: string[];
    status?: string;
    communityRef?: string[];
    shortDescription?: string;
  };
  applicationConfig: FundingProgramConfig | null;
  communitySlug?: string;
  communityUID?: string;
  metrics?: {
    totalApplications: number;
    pendingApplications?: number;
    approvedApplications: number;
    rejectedApplications?: number;
    revisionRequestedApplications?: number;
    underReviewApplications?: number;
  };
}

// Alias for backward compat
export type Program = FundingProgram;

// Core application entity
export interface Application {
  id: string;
  programId: string;
  chainID: number;
  applicantEmail: string;
  applicationData: Record<string, unknown>;
  status: ApplicationStatus;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    reason: string;
  }>;
  referenceNumber: string;
  submissionIP: string;
  createdAt: string;
  updatedAt: string;
  programTitle?: string;
  userId?: string;
  ownerAddress: string;
  postApprovalData?: Record<string, unknown>;
  postApprovalSubmittedAt?: string;
  postApprovalUpdatedAt?: string;
  postApprovalCompleted?: boolean;
}

export interface User {
  id: string;
  address: string;
  chainId: number;
  ens?: string;
  avatar?: string;
  email?: string;
  name?: string;
  bio?: string;
  twitter?: string;
  github?: string;
  applications?: Application[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Grant {
  id: string;
  programId: string;
  name: string;
  description: string;
  amount: string;
  currency: string;
  chainId: number;
  recipientAddress?: string;
  recipientId?: string;
  transactionHash?: string;
  milestone?: string;
  disbursedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  error?: string;
}

// Filter types
export interface ProgramFilters {
  status?: ProgramStatus;
  communityId?: TenantId;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ApplicationFilters {
  status?: ApplicationStatus;
  programId?: string;
  userId?: string;
  search?: string;
  page?: number;
  limit?: number;
}
