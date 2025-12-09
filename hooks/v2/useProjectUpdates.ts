import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/components/Utilities/PrivyProviderWrapper";
import { getProjectUpdates } from "@/services/project-updates.service";
import type {
  GrantMilestoneWithDetails,
  GrantUpdateWithDetails,
  ProjectMilestone,
  ProjectUpdate,
  UnifiedMilestone,
  UpdatesApiResponse,
} from "@/types/v2/roadmap";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Converts API response to UnifiedMilestone format for backward compatibility
 * with existing components.
 *
 * Now uses data from API response directly:
 * - recipient field for the milestone creator
 * - grant object with title and community info
 */
const convertToUnifiedMilestones = (data: UpdatesApiResponse): UnifiedMilestone[] => {
  const unified: UnifiedMilestone[] = [];

  // Convert project updates to unified format
  data.projectUpdates.forEach((update: ProjectUpdate) => {
    unified.push({
      uid: update.uid,
      chainID: 0,
      refUID: "",
      type: "activity",
      title: update.title,
      description: update.description,
      completed: false,
      createdAt: update.createdAt || new Date().toISOString(),
      projectUpdate: {
        uid: update.uid,
        attester: update.recipient || "",
        title: update.title,
        text: update.description,
        createdAt: update.createdAt || new Date().toISOString(),
        verified: update.verified,
        startDate: update.startDate || undefined,
        endDate: update.endDate || undefined,
        deliverables: update.associations.deliverables.map((d) => ({
          name: d.name || "",
          proof: d.proof || "",
          description: d.description || "",
        })),
        indicators: update.associations.indicators.map((i) => ({
          id: i.id,
          name: i.name || "",
          description: i.description,
          unitOfMeasure: i.unitOfMeasure,
        })),
      },
      source: {
        type: "update",
      },
    });
  });

  // Convert project milestones to unified format
  data.projectMilestones.forEach((milestone: ProjectMilestone) => {
    const isCompleted = milestone.status === "completed" && milestone.completionDetails !== null;
    // Use recipient from API (the milestone owner)
    const attester = milestone.recipient || "";

    unified.push({
      uid: milestone.uid,
      chainID: 0,
      refUID: "",
      type: "milestone",
      title: milestone.title,
      description: milestone.description,
      completed: isCompleted
        ? {
            createdAt: milestone.completionDetails?.completedAt || "",
            data: {
              proofOfWork: milestone.completionDetails?.proofOfWork,
              reason: milestone.completionDetails?.description,
            },
          }
        : false,
      createdAt: milestone.createdAt || new Date().toISOString(),
      endsAt: milestone.dueDate
        ? Math.floor(new Date(milestone.dueDate).getTime() / 1000)
        : undefined,
      source: {
        type: "milestone",
        projectMilestone: {
          uid: milestone.uid,
          attester,
          completed: isCompleted
            ? {
                createdAt: milestone.completionDetails?.completedAt || "",
                data: {
                  proofOfWork: milestone.completionDetails?.proofOfWork,
                  reason: milestone.completionDetails?.description,
                },
              }
            : undefined,
        } as any,
      },
    });
  });

  // Convert grant milestones to unified format
  data.grantMilestones.forEach((milestone: GrantMilestoneWithDetails) => {
    const isCompleted = milestone.status === "completed" && milestone.completionDetails !== null;
    // Use recipient from API (the milestone owner)
    const attester = milestone.recipient || "";
    const chainID = parseInt(milestone.chainId, 10) || 0;

    // Use grant info directly from API response
    const grantInfo = milestone.grant;

    unified.push({
      uid: milestone.uid,
      chainID,
      refUID: "",
      type: "grant",
      title: milestone.title,
      description: milestone.description,
      completed: isCompleted
        ? {
            createdAt: milestone.completionDetails?.completedAt || "",
            data: {
              proofOfWork: milestone.completionDetails?.proofOfWork,
              reason: milestone.completionDetails?.description,
            },
          }
        : false,
      createdAt: milestone.createdAt || new Date().toISOString(),
      endsAt: milestone.dueDate
        ? Math.floor(new Date(milestone.dueDate).getTime() / 1000)
        : undefined,
      source: {
        type: "grant",
        grantMilestone: {
          milestone: {
            uid: milestone.uid,
            attester,
            data: {
              title: milestone.title,
              description: milestone.description,
              startsAt: undefined,
              endsAt: milestone.dueDate
                ? Math.floor(new Date(milestone.dueDate).getTime() / 1000)
                : undefined,
            },
            completed: isCompleted
              ? {
                  createdAt: milestone.completionDetails?.completedAt || "",
                  data: {
                    proofOfWork: milestone.completionDetails?.proofOfWork,
                    reason: milestone.completionDetails?.description,
                  },
                }
              : undefined,
          },
          grant: {
            uid: grantInfo?.uid || "",
            chainID,
            details: {
              data: {
                title: grantInfo?.title,
                programId: milestone.programId,
              },
            },
            community: {
              details: {
                data: {
                  slug: grantInfo?.communitySlug,
                  name: grantInfo?.communityName,
                  imageURL: grantInfo?.communityImage,
                },
              },
            },
          },
        } as any,
      },
    });
  });

  // Convert grant updates to unified format
  data.grantUpdates?.forEach((update: GrantUpdateWithDetails) => {
    const grantInfo = update.grant;
    const chainID = update.chainId || 0;

    unified.push({
      uid: update.uid,
      chainID,
      refUID: update.refUID || "",
      type: "grant_update",
      title: update.title,
      description: update.text,
      completed: false,
      createdAt: update.createdAt || new Date().toISOString(),
      grantUpdate: {
        // SDK IGrantUpdate format - needs type at root level and data object
        type: "GrantUpdate",
        uid: update.uid,
        refUID: update.refUID || "",
        recipient: update.recipient || "",
        attester: update.recipient || "", // ActivityAttribution uses attester
        createdAt: update.createdAt || new Date().toISOString(),
        data: {
          type: "grant-update",
          title: update.title,
          text: update.text,
          proofOfWork: update.proofOfWork,
          completionPercentage: update.completionPercentage,
        },
        verified: update.verified ? [] : undefined,
      } as any,
      source: {
        type: "grant_update",
        grantMilestone: {
          milestone: {} as any,
          grant: {
            uid: grantInfo?.uid || "",
            chainID,
            details: {
              data: {
                title: grantInfo?.title,
              },
            },
            community: {
              details: {
                data: {
                  slug: grantInfo?.communitySlug,
                  name: grantInfo?.communityName,
                  imageURL: grantInfo?.communityImage,
                },
              },
            },
          },
        } as any,
      },
    });
  });

  return unified;
};

/**
 * Sort milestones by date (newest first)
 */
const sortByDateDescending = (milestones: UnifiedMilestone[]): UnifiedMilestone[] => {
  return [...milestones].sort((a, b) => {
    const getTimestamp = (item: UnifiedMilestone): number => {
      if (item.endsAt) return item.endsAt;
      return new Date(item.createdAt).getTime();
    };

    return getTimestamp(b) - getTimestamp(a);
  });
};

/**
 * Hook to fetch project updates using the API endpoint.
 *
 * This hook replaces the complex multi-call approach with a single API call
 * that returns all updates, project milestones, and grant milestones.
 *
 * @param projectIdOrSlug - The project UID or slug
 * @returns Object containing unified milestones, loading state, error, and refetch function
 */
export function useProjectUpdates(projectIdOrSlug: string) {
  const queryKey = QUERY_KEYS.PROJECT.UPDATES(projectIdOrSlug);

  const {
    data,
    isLoading,
    error,
    refetch: originalRefetch,
  } = useQuery<UpdatesApiResponse>({
    queryKey,
    queryFn: () => getProjectUpdates(projectIdOrSlug),
    enabled: !!projectIdOrSlug,
    staleTime: 5 * 60 * 1000,
  });

  // Convert response to unified format (no longer needs project data)
  const milestones = data ? sortByDateDescending(convertToUnifiedMilestones(data)) : [];

  // Filter pending milestones (not completed)
  const pendingMilestones = milestones.filter((m) => !m.completed);

  // Provide raw data for components that want to use it directly
  const rawData = data;

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey });
    return originalRefetch();
  };

  return {
    milestones,
    pendingMilestones,
    rawData,
    isLoading,
    error,
    refetch,
  };
}

// Alias for backward compatibility during migration
export const useProjectUpdatesV2 = useProjectUpdates;
