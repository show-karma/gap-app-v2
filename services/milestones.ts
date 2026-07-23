import type { IProjectDetails } from "@show-karma/karma-gap-sdk";
import { errorManager } from "@/components/Utilities/errorManager";
import type { Grant } from "@/types/v2/grant";
import type { ProjectUpdateDeliverable } from "@/types/v2/roadmap";
import { api } from "@/utilities/api/client";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";
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
  completionPercentage?: number;
  deliverables?: ProjectUpdateDeliverable[];
}

// Grant milestone verification details (on-chain data)
export interface GrantMilestoneVerificationDetails {
  description: string;
  verifiedAt: string;
  verifiedBy: string;
  attestationUID?: string;
}

// On-chain cancellation overlay (DEV-523). Present only when status === "cancelled".
export interface MilestoneCancellation {
  uid: string; // the cancelled attestation, revoked to un-cancel
  cancelledBy: string;
  cancelledAt: string | null;
  reason: string | null;
}

// Grant milestone with completion data
export interface GrantMilestoneWithCompletion {
  uid: string;
  programId?: string;
  chainId: number;
  title: string;
  description: string;
  dueDate: string;
  startsAt?: number;
  priority?: number;
  status: string;
  completionDetails: GrantMilestoneCompletionDetails | null;
  verificationDetails: GrantMilestoneVerificationDetails | null;
  fundingApplicationCompletion: MilestoneCompletionData | null;
  cancellation?: MilestoneCancellation | null;
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
  grant?: Grant; // Grant data with completed status
}

export interface MilestoneEvaluationItem {
  milestoneUID: string;
  rating: number;
  reasoning: string;
  model: string;
  createdAt: string;
}

export interface MilestoneEvaluationResponse {
  evaluations: MilestoneEvaluationItem[];
}

export async function fetchMilestoneEvaluation(
  milestoneUID: string
): Promise<MilestoneEvaluationResponse> {
  // TODO(#1775): add zod schema
  const data = await api.get<MilestoneEvaluationResponse>(
    INDEXER.MILESTONE.EVALUATION(milestoneUID)
  );

  return data ?? { evaluations: [] };
}

export async function fetchApplicationMilestoneEvaluation(
  referenceNumber: string,
  milestoneTitle: string
): Promise<MilestoneEvaluationResponse> {
  // TODO(#1775): add zod schema
  const data = await api.get<MilestoneEvaluationResponse>(
    INDEXER.V2.FUNDING_APPLICATIONS.MILESTONE_EVALUATION(referenceNumber, milestoneTitle)
  );

  return data ?? { evaluations: [] };
}

function stripChainSuffix(programId: string | undefined): string | undefined {
  if (!programId) return programId;
  return programId.includes("_") ? programId.split("_")[0] : programId;
}

async function fetchGrantByProgramId(
  projectUid: string,
  programId: string
): Promise<Grant | undefined> {
  const grantsEndpoint = INDEXER.V2.PROJECTS.GRANTS(projectUid);
  try {
    // TODO(#1775): add zod schema
    const grants = await api.get<Grant[]>(grantsEndpoint);

    // Compare in normalized form: grant.details.programId may be stored as
    // either "1013" or "1013_42161" depending on when the grant was created,
    // while the caller always passes the chain-stripped form.
    const normalizedTarget = stripChainSuffix(programId);
    return grants.find((g) => stripChainSuffix(g.details?.programId) === normalizedTarget);
  } catch (error) {
    errorManager("Error fetching grant", error, { projectUid, programId });
    return undefined;
  }
}

export async function fetchProjectGrantMilestones(
  projectUid: string,
  programId: string
): Promise<ProjectGrantMilestonesResponse> {
  // Normalize programId (remove chainId suffix if present) before sending to API
  const normalizedProgramId = programId.includes("_") ? programId.split("_")[0] : programId;
  const [project, updatesResponse, grant] = await Promise.all([
    // TODO(#1775): add zod schema
    api
      .get<ProjectData>(INDEXER.V2.PROJECTS.GET(projectUid))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch project: ${message}`);
      }),
    // TODO(#1775): add zod schema
    api
      .get<ProjectUpdatesResponse>(
        `${INDEXER.V2.PROJECTS.UPDATES(projectUid)}?programIds=${normalizedProgramId}&includeFundingApplicationData=true`
      )
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch milestones: ${message}`);
      }),
    fetchGrantByProgramId(projectUid, normalizedProgramId),
  ]);

  const grantMilestones: GrantMilestoneWithCompletion[] = updatesResponse.grantMilestones.map(
    (milestone) => ({
      uid: milestone.uid,
      programId: milestone.programId,
      chainId: milestone.chainId,
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.dueDate,
      startsAt: milestone.startsAt,
      priority: milestone.priority,
      status: milestone.status,
      completionDetails: milestone.completionDetails,
      verificationDetails: milestone.verificationDetails,
      fundingApplicationCompletion: milestone.fundingApplicationCompletion || null,
      cancellation: milestone.cancellation ?? null,
    })
  );

  return {
    project,
    grantMilestones,
    grant,
  };
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
