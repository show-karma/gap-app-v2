// Community API Response types

export interface CommunityDetails {
  name: string;
  description?: string;
  imageURL?: string;
  logoUrl?: string;
  slug?: string;
  links?: Array<{
    url: string;
    type: string;
  }>;
}

export interface CommunityDetailsResponse {
  uid: `0x${string}`;
  chainID: number;
  details: {
    name: string;
    description?: string;
    slug: string;
    logoUrl?: string;
    imageURL?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// V2 type alias - Community now refers to the strict V2 response
export type Community = CommunityDetailsResponse;

export interface ProjectUpdatesBreakdown {
  projectMilestones: number;
  projectCompletedMilestones: number;
  projectUpdates: number;
  grantMilestones: number;
  grantCompletedMilestones: number;
  grantUpdates: number;
}

export interface CommunityStats {
  totalProjects: number;
  totalGrants: number;
  totalMilestones: number;
  projectUpdates: number;
  projectUpdatesBreakdown: ProjectUpdatesBreakdown;
  totalTransactions: number;
  averageCompletion: number;
}

export interface Project {
  uid: string;
  details: {
    title: string;
    description: string;
    logoUrl: string;
    slug: string;
  };
  categories: string[];
  regions: string[];
  grantNames: string[];
  members: Array<{
    address: string;
    role: string;
    joinedAt: string;
  }>;
  links: Array<{
    url: string;
    type: string;
  }>;
  endorsements: Array<{
    endorser: string;
    endorsement: string;
    createdAt: string;
  }>;
  contractAddresses: string[];
  numMilestones: number;
  numUpdates: number;
  percentCompleted: number;
  numTransactions: number;
  createdAt: string;
}

export interface CommunityProjectsResponse {
  payload: Project[];
  pagination: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
    nextPage: number | null;
    prevPage: number | null;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Aliases for backward compatibility during migration
export type CommunityDetailsV2 = CommunityDetailsResponse;
export type CommunityStatsV2 = CommunityStats;
export type ProjectV2 = Project;
export type CommunityProjectsV2Response = CommunityProjectsResponse;
