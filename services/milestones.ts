import { INDEXER } from "@/utilities/indexer";
import { envVars } from "@/utilities/enviromentVars";

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
  fundingApplication: FundingApplication;
  mappedMilestones: MappedMilestone[];
}

export async function fetchProjectGrantMilestones(
  projectUid: string,
  programId: string
): Promise<ProjectGrantMilestonesResponse> {
  const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.V2.PROJECTS.GRANT_MILESTONES(projectUid, programId)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch milestones: ${response.statusText}`);
  }

  return response.json();
}

export async function updateMilestoneCompletion(
  completionId: string,
  completionText: string
): Promise<MilestoneCompletion> {
  const url = `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}/v2/milestone-completions/${completionId}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ completionText }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update completion: ${response.statusText}`);
  }

  const data = await response.json();
  return data.completion || data;
}
