export interface Community {
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

export interface CommunityProject {
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

export interface CommunityProjects {
  payload: CommunityProject[];
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
