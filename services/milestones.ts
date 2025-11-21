import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { envVars } from "@/utilities/enviromentVars";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import type { IProjectDetails } from "@show-karma/karma-gap-sdk";
import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

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
  grant?: IGrantResponse; // Grant data with completed status
}

/**
 * Fetch grant with completed status by project UID and programId
 * Uses the v2 grant milestones endpoint to get grant UID, then fetches grant with completed status
 */
async function fetchGrantWithCompletedStatus(
  projectUid: string,
  programId: string
): Promise<IGrantResponse | null> {
  try {
    // Step 1: Get grant UID from v2 endpoint
    const grantMilestonesEndpoint = INDEXER.V2.PROJECTS.GRANT_MILESTONES(projectUid, programId);
    const grantResponse = await apiClient.get<{ grant?: { uid: string; chainID: number } }>(
      grantMilestonesEndpoint
    );

    const grantUID = grantResponse.data.grant?.uid;
    if (!grantUID) {
      return null;
    }

    // Step 2: Fetch grant with completed status from v1 endpoint
    const grantDetailResponse = await apiClient.get<IGrantResponse>(
      INDEXER.GRANTS.BY_UID(grantUID)
    );

    return grantDetailResponse.data;
  } catch (error) {
    console.error("Error fetching grant with completed status:", error);
    return null;
  }
}

export async function fetchProjectGrantMilestones(
  projectUid: string,
  programId: string
): Promise<ProjectGrantMilestonesResponse> {
  // Fetch project details, milestones, and grant with completed status in parallel
  const [projectResponse, milestonesResponse, grantWithCompleted] = await Promise.all([
    fetchData(INDEXER.V2.PROJECTS.GET(projectUid), "GET"),
    fetchData(
      `${INDEXER.V2.PROJECTS.UPDATES(projectUid)}?programIds=${programId}&includeFundingApplicationData=true`,
      "GET"
    ),
    fetchGrantWithCompletedStatus(projectUid, programId),
  ]);

  const [projectData, projectError] = projectResponse;
  const [milestonesData, milestonesError] = milestonesResponse;

  if (projectError || !projectData) {
    throw new Error(`Failed to fetch project: ${projectError || "No data returned"}`);
  }

  if (milestonesError || !milestonesData) {
    throw new Error(`Failed to fetch milestones: ${milestonesError || "No data returned"}`);
  }

  const project = projectData as ProjectData & { grants?: IGrantResponse[] };
  const updatesResponse = milestonesData as ProjectUpdatesResponse;

  // Ensure fundingApplicationCompletion is always present (null if missing)
  const grantMilestones: GrantMilestoneWithCompletion[] = updatesResponse.grantMilestones.map(milestone => ({
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
  }));

  // Use the grant fetched with completed status, or fallback to finding it in project.grants
  const grant = grantWithCompleted || project.grants?.find(
    (g) => g.details?.data?.programId === programId
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
  await apiClient.post(
    `/v2/funding-applications/${referenceNumber}/milestone-completions/verify`,
    {
      milestoneFieldLabel,
      milestoneTitle,
      verificationComment: verificationComment || "",
    }
  );
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
