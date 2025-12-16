import type { IProjectMilestoneResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { errorManager } from "@/components/Utilities/errorManager";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

export type StatusOptions = "all" | "completed" | "pending";

// V2 API response types
interface ProjectMilestoneCompletedV2 {
  timestamp: string;
  attestationUID: string;
  proofOfWork: string | null;
  reason: string | null;
  attester: string;
}

interface ProjectMilestoneV2 {
  uid: string;
  title: string;
  description: string;
  dueDate: string | null;
  currentStatus: string;
  statusUpdatedAt: string | null;
  completed: ProjectMilestoneCompletedV2 | null;
  createdAt: string;
}

interface GetMilestonesV2Response {
  milestones: ProjectMilestoneV2[];
}

// Map V2 response to SDK-compatible format
// Using type assertion since V2 response has slightly different shape
const mapV2ToSdkFormat = (milestone: ProjectMilestoneV2): IProjectMilestoneResponse =>
  ({
    uid: milestone.uid,
    refUID: milestone.uid, // Using uid as refUID
    data: {
      title: milestone.title,
      text: milestone.description,
      type: "project-milestone" as const,
    },
    completed: milestone.completed
      ? ({
          uid: milestone.completed.attestationUID,
          createdAt: new Date(milestone.completed.timestamp),
          data: {
            reason: milestone.completed.reason || undefined,
            proofOfWork: milestone.completed.proofOfWork || undefined,
          },
        } as IProjectMilestoneResponse["completed"])
      : undefined,
    createdAt: new Date(milestone.createdAt),
    updatedAt: milestone.statusUpdatedAt ? new Date(milestone.statusUpdatedAt) : undefined,
    // Additional fields expected by components that use this data
    title: milestone.title,
    description: milestone.description,
    endsAt: milestone.dueDate ? new Date(milestone.dueDate) : undefined,
    startsAt: undefined,
    priority: undefined,
  }) as unknown as IProjectMilestoneResponse;

export async function getProjectObjectives(
  uidOrSlug: string
): Promise<IProjectMilestoneResponse[]> {
  try {
    const [data, error] = await fetchData<GetMilestonesV2Response>(
      INDEXER.V2.PROJECTS.MILESTONES(uidOrSlug),
      "GET",
      {},
      {},
      {},
      false
    );

    if (error || !data) {
      errorManager("Error fetching project objectives", error, {
        projectId: uidOrSlug,
      });
      return [];
    }

    return (data.milestones || []).map(mapV2ToSdkFormat);
  } catch (error) {
    errorManager("Error fetching project objectives", error, {
      projectId: uidOrSlug,
    });
    return [];
  }
}
