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
        recipient: update.recipient,
        title: update.title,
        description: update.description,
        verified: update.verified,
        startDate: update.startDate,
        endDate: update.endDate,
        createdAt: update.createdAt,
        associations: {
          deliverables: update.associations.deliverables,
          indicators: update.associations.indicators,
          funding: update.associations.funding,
        },
      },
      source: {
        type: "update",
      },
    });
  });

  // Convert project milestones to unified format
  data.projectMilestones.forEach((milestone: ProjectMilestone) => {
    // A milestone is completed if status is "completed" (completionDetails may or may not be present)
    const isCompleted = milestone.status === "completed";
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
            createdAt: milestone.completionDetails?.completedAt || milestone.createdAt || "",
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
                createdAt: milestone.completionDetails?.completedAt || milestone.createdAt || "",
                data: {
                  proofOfWork: milestone.completionDetails?.proofOfWork,
                  reason: milestone.completionDetails?.description,
                },
              }
            : undefined,
        },
      },
    });
  });

  // Convert grant milestones to unified format
  data.grantMilestones.forEach((milestone: GrantMilestoneWithDetails) => {
    // A milestone is completed if status is "completed" (completionDetails may or may not be present)
    const isCompleted = milestone.status === "completed";
    // Use recipient from API (the milestone owner), with extensive fallbacks
    // The API may include additional fields not in the type definition
    const milestoneAny = milestone as any;
    const attester =
      milestone.recipient ||
      milestoneAny.attester ||
      milestone.completionDetails?.completedBy ||
      milestone.fundingApplicationCompletion?.ownerAddress ||
      milestoneAny.data?.attester ||
      milestoneAny.data?.recipient ||
      "";
    const chainID = parseInt(milestone.chainId, 10) || 0;

    // Extract dueDate with fallbacks - API may pass raw data with endsAt
    let milestoneEndsAt: number | undefined;
    if (milestone.dueDate) {
      milestoneEndsAt = Math.floor(new Date(milestone.dueDate).getTime() / 1000);
    } else if (milestoneAny.data?.endsAt) {
      // Raw attestation data may have endsAt as Unix timestamp
      const endsAt = Number(milestoneAny.data.endsAt);
      if (!isNaN(endsAt) && endsAt > 0) {
        // Check if seconds (10 digits) or milliseconds (13+ digits)
        const digitCount = Math.floor(Math.log10(Math.abs(endsAt))) + 1;
        milestoneEndsAt = digitCount <= 10 ? endsAt : Math.floor(endsAt / 1000);
      }
    } else if (milestoneAny.endsAt) {
      // Direct endsAt field
      const endsAt = Number(milestoneAny.endsAt);
      if (!isNaN(endsAt) && endsAt > 0) {
        const digitCount = Math.floor(Math.log10(Math.abs(endsAt))) + 1;
        milestoneEndsAt = digitCount <= 10 ? endsAt : Math.floor(endsAt / 1000);
      }
    }

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
            createdAt: milestone.completionDetails?.completedAt || milestone.createdAt || "",
            data: {
              proofOfWork: milestone.completionDetails?.proofOfWork,
              reason: milestone.completionDetails?.description,
              completionPercentage: milestone.completionDetails?.completionPercentage,
              deliverables: milestone.completionDetails?.deliverables,
            },
          }
        : false,
      createdAt: milestone.createdAt || new Date().toISOString(),
      endsAt: milestoneEndsAt,
      source: {
        type: "grant",
        grantMilestone: {
          completionDetails: milestone.completionDetails,
          milestone: {
            uid: milestone.uid,
            chainID,
            attester,
            title: milestone.title,
            description: milestone.description,
            endsAt: milestoneEndsAt,
            completed: isCompleted
              ? {
                  createdAt: milestone.completionDetails?.completedAt || milestone.createdAt || "",
                  attester: milestone.completionDetails?.completedBy,
                  data: {
                    proofOfWork: milestone.completionDetails?.proofOfWork,
                    reason: milestone.completionDetails?.description,
                    completionPercentage: milestone.completionDetails?.completionPercentage,
                    deliverables: milestone.completionDetails?.deliverables,
                  },
                }
              : undefined,
            verified: milestone.verificationDetails
              ? [
                  {
                    uid: milestone.verificationDetails.attestationUID || "",
                    attester: milestone.verificationDetails.verifiedBy || "",
                    reason: milestone.verificationDetails.description,
                    createdAt: milestone.verificationDetails.verifiedAt || "",
                  },
                ]
              : [],
          },
          grant: {
            uid: grantInfo?.uid || "",
            chainID,
            details: {
              title: grantInfo?.title,
              programId: milestone.programId,
            },
            community: {
              uid: "",
              chainID,
              details: {
                slug: grantInfo?.communitySlug,
                name: grantInfo?.communityName,
                imageURL: grantInfo?.communityImage,
              },
            },
          },
        },
      },
    });
  });

  // Convert grant updates to unified format
  data.grantUpdates?.forEach((update: GrantUpdateWithDetails, index: number) => {
    const grantInfo = update.grant;
    const chainID = update.chainId || 0;
    // Extract recipient with fallbacks - API may include additional fields
    const updateAny = update as any;

    // Debug: log first grant update to see all available fields
    if (index === 0) {
      console.log("[useProjectUpdates] First grant update raw data:", update);
      console.log("[useProjectUpdates] First grant update as any:", updateAny);
    }
    const updateRecipient =
      update.recipient ||
      updateAny.attester ||
      updateAny.data?.recipient ||
      updateAny.data?.attester ||
      "";

    // Extract endsAt with fallbacks - API may pass raw data with endsAt
    let updateEndsAt: number | undefined;
    if (updateAny.dueDate) {
      updateEndsAt = Math.floor(new Date(updateAny.dueDate).getTime() / 1000);
    } else if (updateAny.data?.endsAt) {
      const endsAt = Number(updateAny.data.endsAt);
      if (!isNaN(endsAt) && endsAt > 0) {
        const digitCount = Math.floor(Math.log10(Math.abs(endsAt))) + 1;
        updateEndsAt = digitCount <= 10 ? endsAt : Math.floor(endsAt / 1000);
      }
    } else if (updateAny.endsAt) {
      const endsAt = Number(updateAny.endsAt);
      if (!isNaN(endsAt) && endsAt > 0) {
        const digitCount = Math.floor(Math.log10(Math.abs(endsAt))) + 1;
        updateEndsAt = digitCount <= 10 ? endsAt : Math.floor(endsAt / 1000);
      }
    }

    unified.push({
      uid: update.uid,
      chainID,
      refUID: update.refUID || "",
      type: "grant_update",
      title: update.title,
      description: update.text,
      completed: false,
      createdAt: update.createdAt || new Date().toISOString(),
      endsAt: updateEndsAt,
      grantUpdate: {
        // Partial IGrantUpdate format for backward compatibility
        type: "GrantUpdate",
        uid: update.uid,
        refUID: update.refUID || "",
        recipient: updateRecipient,
        attester: updateRecipient,
        createdAt: update.createdAt || new Date().toISOString(),
        data: {
          type: "grant-update",
          title: update.title,
          text: update.text,
          proofOfWork: update.proofOfWork,
          completionPercentage: update.completionPercentage,
        },
        verified: update.verified ? [] : undefined,
      },
      source: {
        type: "grant_update",
        grantMilestone: {
          milestone: {
            uid: "",
            chainID,
            attester: updateRecipient, // Add attester for consistency with grant milestones
            title: update.title,
            verified: [],
          },
          grant: {
            uid: grantInfo?.uid || "",
            chainID,
            details: {
              title: grantInfo?.title,
            },
            community: {
              uid: "",
              chainID,
              details: {
                slug: grantInfo?.communitySlug,
                name: grantInfo?.communityName,
                imageURL: grantInfo?.communityImage,
              },
            },
          },
        },
      },
    });
  });

  return unified;
};

/**
 * Sort milestones by date (newest first)
 * Uses endsAt (due date) for milestones, createdAt for activities/updates
 * Note: endsAt is in seconds, createdAt needs conversion from ISO string to seconds
 */
const sortByDateDescending = (milestones: UnifiedMilestone[]): UnifiedMilestone[] => {
  return [...milestones].sort((a, b) => {
    const getTimestamp = (item: UnifiedMilestone): number => {
      // endsAt is already in seconds (Unix timestamp)
      if (item.endsAt) return item.endsAt;
      // Convert createdAt from ISO string to seconds to match endsAt units
      return Math.floor(new Date(item.createdAt).getTime() / 1000);
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
