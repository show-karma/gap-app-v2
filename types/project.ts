import type { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

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

// V2 Project API Response structure
export interface ProjectV2Response {
  uid: `0x${string}`;
  chainID: number;
  owner: `0x${string}`;
  payoutAddress?: string;
  details: {
    title: string;
    description: string;
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
  };
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
  milestones?: IProjectMilestoneResponse;
  impacts?: any[];
  updates?: any[];
  communities?: string[];
  grants?: any[]; // Grants are fetched separately and added to the response
  symlinks?: any[];
  pointers?: any[];
}
