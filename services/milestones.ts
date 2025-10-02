import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { envVars } from "@/utilities/enviromentVars";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import {
  IProjectResponse,
  IGrantResponse,
  IMilestoneResponse
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

// Milestone completion data from funding applications
export interface MilestoneCompletionData {
  id: string;
  completionText: string;
  ownerAddress: string;
  isVerified: boolean;
  verifiedBy: string;
  verificationComment: string;
  createdAt: string;
  updatedAt: string;
}

// Mapped milestone combining grant milestone with completion data
export interface MappedGrantMilestone {
  milestoneFieldLabel: string;
  milestoneTitle: string;
  applicationData: {
    title: string;
    description: string;
    dueDate: string;
  };
  onChainMilestoneUID: string;
  completion: MilestoneCompletionData | null;
}

// Funding application data (from indexer v2)
export interface FundingApplicationData {
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

// Response from the grant milestones endpoint
export interface ProjectGrantMilestonesResponse {
  project: IProjectResponse;
  grant: IGrantResponse;
  fundingApplication: FundingApplicationData | null;
  mappedMilestones: MappedGrantMilestone[];
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
): Promise<MilestoneCompletionData> {
  const response = await apiClient.put<{ completion: MilestoneCompletionData }>(
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
