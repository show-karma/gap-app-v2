export interface CommunityDetailsV2 {
  uid: string;
  chainID: number;
  details: {
    name: string;
    description: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CommunityStatsV2 {
  totalProjects: number;
  totalGrants: number;
  totalMilestones: number;
  totalUpdates: number;
  totalTransactions: number;
  averageCompletion: number;
}

export interface ProjectV2 {
  uid: string;
  details: {
    title: string;
    description: string;
    logoUrl: string;
    category: string;
  };
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

export interface CommunityProjectsV2Response {
  payload: ProjectV2[];
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