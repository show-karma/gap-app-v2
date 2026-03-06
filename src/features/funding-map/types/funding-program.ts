/**
 * Opportunity type union — mirrors backend OpportunityType enum
 */
export type OpportunityType = "grant" | "hackathon" | "bounty" | "accelerator" | "vc_fund" | "rfp";

/**
 * Typed metadata for hackathon opportunities
 */
export interface HackathonMetadata {
  startDate: string;
  endDate: string;
  location: string;
  tracks?: string[];
  prizes?: Array<{
    track?: string;
    amount: string | number;
    currency: string;
  }>;
  registrationDeadline?: string;
  teamSize?: { min: number; max: number };
}

/**
 * Typed metadata for bounty opportunities
 */
export interface BountyMetadata {
  reward: { amount: string | number; currency: string };
  difficulty?: "beginner" | "intermediate" | "advanced";
  skills?: string[];
  platform?: string;
}

/**
 * Typed metadata for accelerator opportunities
 */
export interface AcceleratorMetadata {
  applicationDeadline?: string;
  programDuration?: number;
  batchSize?: number;
  equity?: string;
  funding?: { amount: string | number; currency: string };
  stage?: "pre-seed" | "seed" | "series-a";
  location?: string;
}

/**
 * Typed metadata for VC fund opportunities
 */
export interface VcFundMetadata {
  checkSize?: { min: number; max: number; currency: string };
  stage?: "pre-seed" | "seed" | "series-a" | "series-b+";
  thesis?: string;
  portfolio?: string[];
  contactMethod?: "email" | "form" | "intro-only";
  activelyInvesting?: boolean;
}

/**
 * Typed metadata for RFP opportunities
 */
export interface RfpMetadata {
  issuingOrganization: string;
  budget?: { amount: string | number; currency: string };
  scope?: string;
  requirements?: string[];
}

/**
 * Type count from the /types endpoint
 */
export interface TypeCount {
  type: string;
  count: number;
  activeCount: number;
}

export interface FundingProgramMetadata {
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
    facebook?: string;
    instagram?: string;
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
  shortDescription?: string;
  logoImgData?: string;
  grantsToDate?: number;
  bannerImgData?: string;
  programBudget?: string;
  projectTwitter?: string;
  applicantsNumber?: number;
  amountDistributedToDate?: string;
  platformsUsed?: string[];
  anyoneCanJoin?: boolean;
  invoiceRequired?: boolean;
  status: string;
  communityRef?: string[];
  adminEmails?: string[];
  financeEmails?: string[];
}

/**
 * Community information from the communities collection
 */
export interface FundingProgramCommunity {
  uid: string;
  name?: string;
  slug?: string;
  imageUrl?: string;
}

/**
 * API response type - matches the raw response from the indexer
 */
export interface FundingProgramResponse {
  /** MongoDB _id - can be string (V2 API) or { $oid: string } (legacy format) */
  _id: string | { $oid: string };
  id?: string;
  createdAtBlock?: string;
  createdByAddress?: string;
  trackedProjects?: number;
  metadata?: FundingProgramMetadata;
  tags?: string[];
  updatedAtBlock?: string;
  projectNumber?: null;
  projectType?: string;
  registryAddress?: string;
  anchorAddress?: string;
  programId?: string;
  chainID?: number;
  isValid?: boolean;
  /** Whether this program has a funding configuration on Karma */
  isOnKarma?: boolean;
  /** Communities information (from communities collection lookup) */
  communities?: FundingProgramCommunity[];
  txHash?: string;
  createdAt: string;
  updatedAt: string;
  admins?: string[];
  langfusePromptId?: string;
  refToGrant?: string;
  /** Opportunity type — defaults to 'grant' when absent */
  type?: OpportunityType;
  /** Whether the opportunity is currently active */
  isActive?: boolean;
  /** Global deadline for the opportunity */
  deadline?: string;
  /** Direct submission/application URL */
  submissionUrl?: string;
  /** Hackathon-specific metadata */
  hackathonMetadata?: HackathonMetadata;
  /** Bounty-specific metadata */
  bountyMetadata?: BountyMetadata;
  /** Accelerator-specific metadata */
  acceleratorMetadata?: AcceleratorMetadata;
  /** VC fund-specific metadata */
  vcFundMetadata?: VcFundMetadata;
  /** RFP-specific metadata */
  rfpMetadata?: RfpMetadata;
}

/**
 * Paginated response from the API (V2)
 */
export interface PaginatedFundingProgramsResponse {
  programs: FundingProgramResponse[];
  count: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Paginated response with total pages calculated
 */
export interface PaginatedFundingPrograms {
  programs: FundingProgramResponse[];
  count: number;
  totalPages: number;
}

/**
 * Parameters for fetching funding programs
 */
export interface FetchFundingProgramsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  categories?: string[];
  ecosystems?: string[];
  networks?: string[];
  grantTypes?: string[];
  onlyOnKarma?: boolean;
  /** Filter by community UID (from communityRef) */
  communityUid?: string;
  /** Filter by organization name (from metadata.organizations) */
  organization?: string;
  /** Filter by opportunity type */
  type?: OpportunityType[];
}

/**
 * Filter option for organization/community dropdown
 */
export interface OrganizationFilterOption {
  /** Unique identifier - community uid or organization name */
  id: string;
  /** Display name */
  name: string;
  /** Type of filter option */
  type: "community" | "organization";
  /** Community image URL (only for communities) */
  imageUrl?: string;
  /** Number of programs with this organization/community */
  programCount: number;
}

/**
 * Response for organization filter options
 */
export interface OrganizationFiltersResponse {
  options: OrganizationFilterOption[];
}
