import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { envVars } from "@/utilities/enviromentVars";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import type { IProjectDetails } from "@show-karma/karma-gap-sdk";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
const apiClient = createAuthenticatedApiClient(API_URL, 30000);

// Milestone completion data from funding applications
export interface MilestoneCompletionData {
  id: string;
  referenceNumber: string;
  milestoneFieldLabel: string;
  milestoneTitle: string;
  completionText: string;
  ownerAddress: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationComment?: string;
  createdAt: string;
  updatedAt: string;
}

// Grant milestone completion details (on-chain data)
export interface GrantMilestoneCompletionDetails {
  description: string;
  completedAt: string;
  completedBy: string;
  attestationUID?: string;
  proofOfWork?: string;
}

// Grant milestone verification details (on-chain data)
export interface GrantMilestoneVerificationDetails {
  description: string;
  verifiedAt: string;
  verifiedBy: string;
  attestationUID?: string;
}

// Grant milestone from project updates endpoint
export interface GrantMilestoneWithCompletion {
  uid: string;
  programId?: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  completionDetails: GrantMilestoneCompletionDetails | null;
  verificationDetails: GrantMilestoneVerificationDetails | null;
  fundingApplicationCompletion?: MilestoneCompletionData | null;
}

// Mapped milestone combining grant milestone with completion data
export interface MappedGrantMilestone {
  uid: string;
  programId?: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  completionDetails: GrantMilestoneCompletionDetails | null;
  verificationDetails: GrantMilestoneVerificationDetails | null;
  fundingApplicationCompletion: MilestoneCompletionData | null;
}

// Response from the project updates endpoint
export interface ProjectUpdatesResponse {
  projectUpdates: any[];
  projectMilestones: any[];
  grantMilestones: GrantMilestoneWithCompletion[];
}

// Project data from V2 endpoint - using SDK types
export interface ProjectData {
  uid: string;
  chainID: number;
  owner: string;
  payoutAddress?: string;
  details: IProjectDetails;
}

// Response from the grant milestones endpoint
export interface ProjectGrantMilestonesResponse {
  project: ProjectData;
  grantMilestones: MappedGrantMilestone[];
}

export async function fetchProjectGrantMilestones(
  projectUid: string,
  programId: string
): Promise<ProjectGrantMilestonesResponse> {
  // Fetch project details and milestones in parallel
  const [projectResponse, milestonesResponse] = await Promise.all([
    fetchData(INDEXER.V2.PROJECTS.GET(projectUid), "GET"),
    fetchData(
      `${INDEXER.V2.PROJECTS.UPDATES(projectUid)}?programIds=${programId}&includeFundingApplicationData=true`,
      "GET"
    ),
  ]);

  const [projectData, projectError] = projectResponse;
  const [milestonesData, milestonesError] = milestonesResponse;

  if (projectError || !projectData) {
    throw new Error(`Failed to fetch project: ${projectError || "No data returned"}`);
  }

  if (milestonesError || !milestonesData) {
    throw new Error(`Failed to fetch milestones: ${milestonesError || "No data returned"}`);
  }

  const project = projectData as ProjectData;
  const updatesResponse = milestonesData as ProjectUpdatesResponse;

  // Map grant milestones to our format
  const grantMilestones: MappedGrantMilestone[] = updatesResponse.grantMilestones.map(milestone => ({
    uid: milestone.uid,
    programId: milestone.programId,
    title: milestone.title,
    description: milestone.description,
    dueDate: milestone.dueDate,
    status: milestone.status,
    completionDetails: milestone.completionDetails,
    verificationDetails: milestone.verificationDetails,
    fundingApplicationCompletion: milestone.fundingApplicationCompletion || null,
  }));

  return {
    project,
    grantMilestones,
  };
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
