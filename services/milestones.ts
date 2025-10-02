import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { envVars } from "@/utilities/enviromentVars";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

export interface MilestoneCompletion {
  id: string;
  completionText: string;
  ownerAddress: string;
  isVerified: boolean;
  verifiedBy: string;
  verificationComment: string;
  createdAt: string;
  updatedAt: string;
}

export interface MappedMilestone {
  milestoneFieldLabel: string;
  milestoneTitle: string;
  applicationData: {
    title: string;
    description: string;
    dueDate: string;
  };
  onChainMilestoneUID: string;
  completion: MilestoneCompletion | null;
}

export interface GrantMilestone {
  uid: string;
  title: string;
  description: string;
  dueDate: string;
  currentStatus: string;
  statusUpdatedAt: string;
  statusHistory: Array<{
    status: string;
    updatedAt: string;
  }>;
}

export interface ProjectDetails {
  title: string;
  description: string;
  problem: string;
  solution: string;
  missionSummary: string;
  locationOfImpact: string;
  slug: string;
  logoUrl: string;
  businessModel: string;
  stageIn: string;
  raisedMoney: string;
  pathToTake: string;
  tags: string[];
  links: any[];
  lastDetailsUpdate: string;
}

export interface Project {
  uid: string;
  chainID: number;
  owner: string;
  details: ProjectDetails;
  external: {
    gitcoin: any[];
    oso: any[];
    divvi_wallets: any[];
    github: any[];
    network_addresses: any[];
  };
  members: Array<{
    address: string;
    role: string;
    joinedAt: string;
  }>;
  endorsements: any[];
  milestones: any[];
  impacts: any[];
  updates: any[];
  communities: string[];
}

export interface Grant {
  uid: string;
  chainID: number;
  projectUID: string;
  communityUID: string;
  programId: string;
  originalProjectUID: string;
  details: {
    title: string;
    description: string;
    amount: string;
    payoutAddress: string;
    startDate: string | null;
    proposalURL: string;
    lastDetailsUpdate: string;
  };
  milestones: GrantMilestone[];
  updates: any[];
  createdAt: string;
  updatedAt: string;
}

export interface FundingApplication {
  id: string;
  programId: string;
  chainID: number;
  applicantEmail: string;
  ownerAddress: string;
  applicationData: Record<string, any>;
  aiEvaluation: {
    evaluation: string;
    promptId: string;
  };
  status: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    reason?: string;
  }>;
  submissionIP: string;
  referenceNumber: string;
  postApprovalCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectGrantMilestonesResponse {
  project: Project;
  grant: Grant;
  fundingApplication: FundingApplication | null;
  mappedMilestones: MappedMilestone[];
}

export async function fetchProjectGrantMilestones(
  projectUid: string,
  programId: string
): Promise<ProjectGrantMilestonesResponse> {
  const endpoint = INDEXER.V2.PROJECTS.GRANT_MILESTONES(projectUid, programId);
  const [data, error] = await fetchData(endpoint, "GET");

  if (error || !data) {
    throw new Error(`Failed to fetch milestones: ${error || "No data returned"}`);
  }

  return data;
}

export async function updateMilestoneCompletion(
  completionId: string,
  completionText: string
): Promise<MilestoneCompletion> {
  const response = await apiClient.put<{ completion: MilestoneCompletion }>(
    `/v2/milestone-completions/${completionId}`,
    { completionText }
  );
  return response.data.completion;
}

export async function updateMilestoneVerification(
  referenceNumber: string,
  milestoneFieldLabel: string,
  milestoneTitle: string,
  verificationComment?: string
): Promise<void> {
  await apiClient.post(
    `/v2/funding-applications/${referenceNumber}/milestone-completions/verify`,
    {
      milestoneFieldLabel,
      milestoneTitle,
      verificationComment: verificationComment || "",
    }
  );
}
