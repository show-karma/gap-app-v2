// V2 Project API Response types
// Re-export from main project types for consistency
export type { ProjectV2Response } from "@/types/project";

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

export interface Project {
  uid: string;
  chainID: number;
  owner?: string;
  payoutAddress?: string;
  details?: ProjectDetails;
  members?: ProjectMember[];
  endorsements?: any[];
  milestones?: any[];
  impacts?: any[];
  updates?: any[];
  communities?: string[];
  grants?: any[];
  symlinks?: any[];
  pointers?: any[];
  createdAt?: string;
  updatedAt?: string;
}
