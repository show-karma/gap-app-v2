export type CommunityReviewerRole = "program-reviewer" | "milestone-reviewer";

export interface CommunityReviewer {
  publicAddress: string;
  name: string;
  email: string;
  telegram?: string;
  slack?: string;
  picture?: string;
  roles: CommunityReviewerRole[];
  lastSeenAt: string; // ISO 8601
}

export interface CommunityReviewersResponse {
  items: CommunityReviewer[];
  nextCursor: string | null;
}

export interface FetchCommunityReviewersParams {
  programId?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface CommunityReviewerProgram {
  programId: string;
  name: string;
  reviewerCount: number;
}

export interface CommunityReviewerProgramsResponse {
  items: CommunityReviewerProgram[];
}
