// Core community types and interfaces
export interface Community {
  uid: string;
  name: string;
  description: string;
  imageUrl?: string;
  bannerUrl?: string;
  categories: string[];
  tracks: Track[];
  createdAt: string;
  updatedAt: string;
  ownerAddress: string;
  // Add other community properties as needed
}

export interface Track {
  uid: string;
  name: string;
  description: string;
  communityUid: string;
  createdAt: string;
}

export interface CommunityAdmin {
  uid: string;
  address: string;
  role: 'admin' | 'moderator';
  communityUid: string;
  addedAt: string;
}

export interface CommunityCategory {
  uid: string;
  name: string;
  description: string;
  communityUid: string;
  createdAt: string;
}

export interface CommunityFilters {
  search?: string;
  categories?: string[];
  orderBy?: 'createdAt' | 'updatedAt' | 'name';
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CommunityFormData {
  name: string;
  description: string;
  imageUrl?: string;
  bannerUrl?: string;
  categories: string[];
}

export interface CommunityStats {
  totalProjects: number;
  totalGrants: number;
  totalFunding: number;
  totalMembers: number;
  totalMilestones: number;
  totalUpdates: number;
}