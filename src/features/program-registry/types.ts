import type { FundingProgramResponse } from "@/src/features/funding-map/types/funding-program";

/**
 * Domain types for Program Registry
 * These types represent the business domain, separate from UI concerns
 */

/**
 * Re-export FundingProgramResponse as GrantProgram so the feature module
 * does not depend on the UI component layer (ProgramList.tsx).
 * Consumers outside this feature still import from ProgramList for now.
 */
export type GrantProgram = FundingProgramResponse;

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
    facebook?: string;
    instagram?: string;
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
  anyoneCanJoin?: boolean;
  invoiceRequired?: boolean;
  status: string;
  type: string;
  tags: string[];
  communityRef: string[];
  adminEmails?: string[];
  financeEmails?: string[];
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
  programId: string;
  isValid: "accepted" | "rejected" | "pending";
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
  adminEmails: string[];
  financeEmails: string[];
  invoiceRequired?: boolean;
}
