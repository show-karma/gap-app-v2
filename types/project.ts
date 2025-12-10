import type { GrantResponse } from "@/types/v2/grant";

export type Contact = {
  id: string;
  name?: string;
  email?: string;
  telegram?: string;
};

export type APIContact = {
  attestationId: {
    $oid: string;
  };
  _id: {
    $oid: string;
  };
  createdAt: string;
  updatedAt: string;
  name?: string;
  email?: string;
  telegram?: string;
};

export interface ProjectReport {
  uid: string;
  slug?: string;
  categories: string[];
  title: string;
  createdAt: string;
  description: string;
  problem?: string;
  solution?: string;
  missionSummary?: string;
  locationOfImpact?: string;
  imageURL?: string;
  links: {
    type: string;
    url: string;
  }[];
  businessModel?: string;
  stageIn?: string;
  raisedMoney?: string;
  fundingPath?: string;
  contact: Contact[];
}

export interface ProjectFromList {
  uid: string;
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  noOfGrants: number;
  noOfProjectMilestones: number;
  noOfGrantMilestones: number;
  imageURL?: string;
}

// Re-export V2 types from their canonical location
export type {
  ProjectDetails,
  ProjectMember,
  ProjectResponse,
} from "@/types/v2/project";
