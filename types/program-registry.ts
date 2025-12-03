/**
 * Domain types for Program Registry
 * These types represent the business domain, separate from UI concerns
 */

export interface ProgramMetadata {
  title: string;
  description: string;
  shortDescription: string;
  programBudget?: number;
  startsAt?: Date;
  endsAt?: Date;
  website: string;
  projectTwitter: string;
  socialLinks: {
    twitter: string;
    website: string;
    discord: string;
    orgWebsite: string;
    blog: string;
    forum: string;
    grantsSite: string;
    telegram: string;
  };
  bugBounty: string;
  categories: string[];
  ecosystems: string[];
  organizations: string[];
  networks: string[];
  grantTypes: string[];
  platformsUsed: string[];
  logoImg: string;
  bannerImg: string;
  logoImgData: Record<string, unknown>;
  bannerImgData: Record<string, unknown>;
  credentials: Record<string, unknown>;
  status: string;
  type: string;
  tags: string[];
  communityRef: string[];
}

export interface ProgramCreationRequest {
  owner: string;
  chainId: number;
  metadata: ProgramMetadata;
}

export interface ProgramCreationResult {
  programId: string;
  success: boolean;
  requiresManualApproval?: boolean;
}

export interface ProgramApprovalRequest {
  id: string;
  isValid: "accepted" | "rejected";
}

export interface CreateProgramFormData {
  name: string;
  description: string;
  shortDescription: string;
  dates: {
    startsAt?: Date;
    endsAt?: Date;
  };
  budget?: number;
}
