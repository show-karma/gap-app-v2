export interface MilestoneDeliverable {
  name: string;
  description: string;
  proof: string;
}

export interface MilestoneIndicator {
  indicatorId: string;
  name: string;
}

export interface MilestoneDetails {
  title: string;
  description: string;
  dueDate: string | null;
  completionDate?: string;
  completionReason?: string;
  deliverables?: MilestoneDeliverable[];
  indicators?: MilestoneIndicator[];
}

export interface ProjectInfo {
  uid: string;
  details: {
    data: {
      title: string;
      slug: string;
    };
  };
}

export interface GrantInfo {
  uid: string;
  details: {
    data: {
      title: string;
    };
  };
}

export interface CommunityMilestoneUpdate {
  uid: string;
  communityUID: string;
  status: "pending" | "completed";
  details: MilestoneDetails;
  project: ProjectInfo;
  grant?: GrantInfo;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityUpdatesResponse {
  payload: CommunityMilestoneUpdate[];
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
