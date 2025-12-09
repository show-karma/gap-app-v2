import type { IProjectDetails } from "@show-karma/karma-gap-sdk";
import type { GrantResponse } from "@/types/v2/grant";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
// Keep apiClient for mutations (PUT, POST)
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

// Grant milestone with completion data
export interface GrantMilestoneWithCompletion {
  uid: string;
  programId?: string;
  chainId: number;
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
  grantMilestones: GrantMilestoneWithCompletion[];
  grant?: GrantResponse; // Grant data with completed status
}

async function fetchGrantByProgramId(
  projectUid: string,
  programId: string
): Promise<GrantResponse | undefined> {
  const grantsEndpoint = INDEXER.V2.PROJECTS.GRANTS(projectUid);
  const [grants, error] = await fetchData<GrantResponse[]>(grantsEndpoint);

  if (error || !grants) {
    console.error("Error fetching grant:", error);
    return undefined;
  }

  return grants.find((g) => g.details?.programId === programId);
}

export async function fetchProjectGrantMilestones(
  projectUid: string,
  programId: string
): Promise<ProjectGrantMilestonesResponse> {
  const [projectResponse, milestonesResponse, grant] = await Promise.all([
    fetchData(INDEXER.V2.PROJECTS.GET(projectUid), "GET"),
    fetchData(
      `${INDEXER.V2.PROJECTS.UPDATES(projectUid)}?programIds=${programId}&includeFundingApplicationData=true`,
      "GET"
    ),
    fetchGrantByProgramId(projectUid, programId),
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

  const grantMilestones: GrantMilestoneWithCompletion[] = updatesResponse.grantMilestones.map(
    (milestone) => ({
      uid: milestone.uid,
      programId: milestone.programId,
      chainId: milestone.chainId,
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.dueDate,
      status: milestone.status,
      completionDetails: milestone.completionDetails,
      verificationDetails: milestone.verificationDetails,
      fundingApplicationCompletion: milestone.fundingApplicationCompletion || null,
    })
  );

  return {
    project,
    grantMilestones,
    grant,
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
  await apiClient.post(`/v2/funding-applications/${referenceNumber}/milestone-completions/verify`, {
    milestoneFieldLabel,
    milestoneTitle,
    verificationComment: verificationComment || "",
  });
}

/**
 * Attest milestone completion as a program reviewer (backend creates on-chain attestation)
 */
export async function attestMilestoneCompletionAsReviewer(
  milestoneUID: string,
  completionComment: string,
  programId: string,
  chainID: number
): Promise<{ txHash: string; attestationUID: string }> {
  const response = await apiClient.post<{ txHash: string; attestationUID: string }>(
    `/v2/milestones/${milestoneUID}/attest-completion`,
    {
      completionComment,
      programId,
      chainID,
    }
  );

  return response.data;
}
