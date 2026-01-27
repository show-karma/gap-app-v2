// Project API Response types

import type { Grant } from "./grant";

export interface ProjectDetails {
  title: string;
  description?: string;
  problem?: string;
  solution?: string;
  missionSummary?: string;
  locationOfImpact?: string;
  slug: string;
  logoUrl?: string;
  businessModel?: string;
  stageIn?: string;
  raisedMoney?: string;
  pathToTake?: string;
  tags?: string[];
  links?: Array<{
    url: string;
    type: string;
  }>;
  lastDetailsUpdate?: string;
}

export interface ProjectMember {
  address: string;
  role: string;
  joinedAt: string;
}

export interface ProjectPointer {
  uid: string;
  originalProjectUID: string;
  createdAt: string;
}

/**
 * Project statistics returned when includeStats=true is passed to the API
 */
export interface ProjectStats {
  grantsCount: number;
  grantMilestonesCount: number;
  roadmapItemsCount: number;
}

export interface Project {
  uid: `0x${string}`;
  chainID: number;
  owner: `0x${string}`;
  payoutAddress?: string;
  /** Chain-specific payout addresses keyed by chain ID (e.g., { "10": "0x...", "42161": "0x..." }) */
  chainPayoutAddress?: Record<string, string>;
  details: ProjectDetails;
  external?: {
    gitcoin?: any[];
    oso?: any[];
    divvi_wallets?: any[];
    github?: any[];
    network_addresses?: any[];
    network_addresses_verified?: Array<{
      network: string;
      address: string;
      verified: boolean;
      verifiedAt?: string;
      verifiedBy?: string;
    }>;
  };
  members: Array<{
    address: string;
    role: string;
    joinedAt: string;
  }>;
  endorsements?: any[];
  communities?: string[];
  symlinks?: any[];
  pointers?: ProjectPointer[];
  createdAt?: string;
  updatedAt?: string;
  /** Stats field - only present when includeStats=true is passed to the API */
  stats?: ProjectStats;
}

/**
 * Extended Project that includes grants data.
 * Used for specific endpoints that return projects with embedded grants (e.g., /v2/user/projects)
 * Note: Most endpoints should fetch grants separately using getProjectGrants()
 */
export interface ProjectWithGrantsResponse extends Project {
  grants?: Grant[];
}

/**
 * Pagination metadata returned by paginated endpoints
 * Matches the backend PaginatedContext.Pagination structure
 */
export interface ProjectsPagination {
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Paginated response for projects endpoints
 * Returned when 'page' parameter is provided to GET /v2/projects
 */
export interface PaginatedProjectsResponse {
  payload: Project[];
  pagination: ProjectsPagination;
}
