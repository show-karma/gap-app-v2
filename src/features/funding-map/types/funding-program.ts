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
  status: string;
  communityRef?: string[];
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
  _id: {
    $oid: string;
  };
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
