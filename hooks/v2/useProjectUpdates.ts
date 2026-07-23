import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { getProjectUpdates } from "@/services/project-updates.service";
import type { UpdatesFeedFilters } from "@/types/v2/project-profile.types";
import type {
  GrantMilestoneWithDetails,
  GrantUpdateWithDetails,
  ProjectMilestone,
  ProjectUpdate,
  UnifiedMilestone,
  UpdatesApiResponse,
} from "@/types/v2/roadmap";
import { assignGrantMilestoneOrder } from "@/utilities/milestones/assignGrantMilestoneOrder";
import { isCancelledMilestoneStatus } from "@/utilities/milestones/getEffectiveMilestoneStatus";
import {
  type MilestoneDueDateInput,
  normalizeMilestoneDueDateMs,
} from "@/utilities/milestones/milestoneDueDate";
import { parseChainId } from "@/utilities/parseChainId";
import { queryClient } from "@/utilities/query-client";
import { QUERY_KEYS } from "@/utilities/queryKeys";

/**
 * Extra fields the API may include beyond the typed milestone/update shapes
 * (raw attestation payloads, embedded grant info). Used for display fallbacks.
 */
interface AttestationExtras {
  attester?: string;
  dueDate?: string | number;
  endsAt?: string | number;
  data?: {
    recipient?: string;
    attester?: string;
    endsAt?: string | number;
  };
  grant?: {
    chainID?: string | number;
    chainId?: string | number;
  };
}

/**
 * Resolve a raw milestone due date (ISO string, epoch seconds, or epoch ms)
 * to UNIX seconds for the `UnifiedMilestone.endsAt` contract, or `undefined`
 * when the value is missing or corrupted. Delegates to the canonical
 * {@link normalizeMilestoneDueDateMs} so seconds-vs-ms disambiguation and the
 * pre-2000 validity floor live in exactly one place.
 */
const resolveEndsAtSeconds = (raw: MilestoneDueDateInput): number | undefined => {
  const ms = normalizeMilestoneDueDateMs(raw);
  return ms == null ? undefined : Math.floor(ms / 1000);
};

/**
 * Converts API response to UnifiedMilestone format for backward compatibility
 * with existing components.
 *
 * Now uses data from API response directly:
 * - recipient field for the milestone creator
 * - grant object with title and community info
 */
export const convertToUnifiedMilestones = (data: UpdatesApiResponse): UnifiedMilestone[] => {
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
    const isCompleted = milestone.status === "completed" || milestone.status === "verified";
    const recipient = milestone.recipient || "";
    // Display attribution falls back to recipient when the on-chain attester
    // isn't present (Karma backend-signed milestones expose attester separately).
    const attester = (milestone as { attester?: string }).attester || recipient;

    unified.push({
      uid: milestone.uid,
      chainID: 0,
      refUID: "",
      type: "milestone",
      title: milestone.title,
      description: milestone.description,
      currentStatus: milestone.status,
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
          recipient,
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
    const isCompleted = milestone.status === "completed" || milestone.status === "verified";
    // Recipient is the on-chain milestone owner (passes Gap.sol's revoke gate).
    // Attester may differ (Karma backend-signed milestones use a service wallet);
    // display attribution falls back to recipient when attester is unavailable.
    const milestoneAny = milestone as unknown as AttestationExtras;
    const recipient =
      milestone.recipient ||
      milestone.completionDetails?.completedBy ||
      milestone.fundingApplicationCompletion?.ownerAddress ||
      milestoneAny.data?.recipient ||
      "";
    const attester = milestoneAny.attester || milestoneAny.data?.attester || recipient;
    // Off-chain completions use fundingApplicationCompletion instead of completionDetails
    const appCompletion = milestone.fundingApplicationCompletion;
    const chainID =
      parseChainId(milestone.chainId) ||
      parseChainId(milestoneAny?.grant?.chainID) ||
      parseChainId(milestoneAny?.grant?.chainId) ||
      0;

    // Extract dueDate with fallbacks - API may pass raw data with endsAt
    // (ISO string, epoch seconds, or epoch ms). The shared normalizer owns the
    // seconds-vs-ms disambiguation and the pre-2000 validity floor.
    const milestoneEndsAt =
      resolveEndsAtSeconds(milestone.dueDate) ??
      resolveEndsAtSeconds(milestoneAny.data?.endsAt) ??
      resolveEndsAtSeconds(milestoneAny.endsAt);

    // Use grant info directly from API response
    const grantInfo = milestone.grant;

    // Use the per-grant ordinal computed server-side. The backend stamps these
    // BEFORE applying any status/date/AI filter, so the badge reflects the
    // milestone's position within the FULL grant — not within the filtered
    // subset, which would otherwise produce misleading totals (e.g. "1 of 1"
    // when filtering by verified instead of the true "2 of 4").
    const serverOrder =
      milestone.grantMilestoneIndex != null && milestone.grantMilestoneTotal != null
        ? { index: milestone.grantMilestoneIndex, total: milestone.grantMilestoneTotal }
        : undefined;

    unified.push({
      uid: milestone.uid,
      chainID,
      refUID: grantInfo?.uid || "",
      type: "grant",
      title: milestone.title,
      description: milestone.description,
      currentStatus: milestone.status,
      grantMilestoneOrder: serverOrder,
      completed: isCompleted
        ? {
            createdAt:
              milestone.completionDetails?.completedAt ||
              appCompletion?.createdAt ||
              milestone.createdAt ||
              "",
            data: {
              proofOfWork: milestone.completionDetails?.proofOfWork,
              reason: milestone.completionDetails?.description || appCompletion?.completionText,
              completionPercentage: milestone.completionDetails?.completionPercentage,
              deliverables: milestone.completionDetails?.deliverables,
            },
          }
        : false,
      createdAt: milestone.createdAt || new Date().toISOString(),
      endsAt: milestoneEndsAt,
      invoiceInfo: milestone.invoiceInfo ?? undefined,
      source: {
        type: "grant",
        grantMilestone: {
          completionDetails: milestone.completionDetails,
          milestone: {
            uid: milestone.uid,
            chainID,
            refUID: grantInfo?.uid || "",
            attester,
            recipient,
            title: milestone.title,
            description: milestone.description,
            endsAt: milestoneEndsAt,
            completed: isCompleted
              ? {
                  createdAt:
                    milestone.completionDetails?.completedAt ||
                    appCompletion?.createdAt ||
                    milestone.createdAt ||
                    "",
                  attester: milestone.completionDetails?.completedBy || appCompletion?.ownerAddress,
                  data: {
                    proofOfWork: milestone.completionDetails?.proofOfWork,
                    reason:
                      milestone.completionDetails?.description || appCompletion?.completionText,
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
            invoiceInfo: milestone.invoiceInfo ?? undefined,
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
  data.grantUpdates?.forEach((update: GrantUpdateWithDetails) => {
    // Extract recipient and chain details with fallbacks - API may include additional fields
    const updateAny = update as unknown as AttestationExtras;
    const grantInfo = update.grant;
    const chainID =
      parseChainId(update.chainId) ||
      parseChainId(updateAny?.grant?.chainID) ||
      parseChainId(updateAny?.grant?.chainId) ||
      0;

    const updateRecipient =
      update.recipient ||
      updateAny.attester ||
      updateAny.data?.recipient ||
      updateAny.data?.attester ||
      "";

    // Extract endsAt with fallbacks - API may pass raw data with endsAt
    // (ISO string, epoch seconds, or epoch ms). Routed through the shared
    // normalizer to keep seconds-vs-ms disambiguation in one place.
    const updateEndsAt =
      resolveEndsAtSeconds(updateAny.dueDate) ??
      resolveEndsAtSeconds(updateAny.data?.endsAt) ??
      resolveEndsAtSeconds(updateAny.endsAt);

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
  return milestones.toSorted((a, b) => {
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
 * @param milestoneStatus - Optional milestone lifecycle filter
 * @param filters - Optional extra filters forwarded to the indexer
 * @returns Object containing unified milestones, loading state, error, and refetch function
 */
/**
 * Shared frozen empty array so the no-data branch returns a STABLE reference
 * across renders. Returning a fresh `[]` each render makes every downstream
 * memo/effect that depends on `milestones` re-run on every render (the request-
 * storm amplifier in DEV-396).
 */
const EMPTY_MILESTONES: UnifiedMilestone[] = [];

interface UseProjectUpdatesOptions {
  /**
   * Whether the request should attach a Privy bearer token. Defaults to
   * `true` for backward compatibility. Public profile callers MUST pass
   * `false` so anonymous client refetches don't trip the indexer's
   * `Authorization header is required` 401 path.
   */
  isAuthorized?: boolean;
}

export function useProjectUpdates(
  projectIdOrSlug: string,
  milestoneStatus?: "pending" | "completed" | "verified",
  filters?: UpdatesFeedFilters,
  options: UseProjectUpdatesOptions = {}
) {
  const { isAuthorized = true } = options;
  // Build a stable query key that includes all active filter values so that
  // React Query invalidates the cache whenever any filter changes. Memoized on
  // the underlying primitives so its identity is stable across renders — the
  // refetch callback below depends on it.
  const queryKey = useMemo(
    () =>
      [
        ...QUERY_KEYS.PROJECT.UPDATES(projectIdOrSlug),
        milestoneStatus ?? null,
        filters?.dateFrom ?? null,
        filters?.dateTo ?? null,
        filters?.hasAIEvaluation ?? null,
        filters?.aiScoreMin ?? null,
        filters?.aiScoreMax ?? null,
      ] as const,
    [
      projectIdOrSlug,
      milestoneStatus,
      filters?.dateFrom,
      filters?.dateTo,
      filters?.hasAIEvaluation,
      filters?.aiScoreMin,
      filters?.aiScoreMax,
    ]
  );

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch: originalRefetch,
  } = useQuery<UpdatesApiResponse>({
    queryKey,
    queryFn: () =>
      getProjectUpdates(projectIdOrSlug, milestoneStatus, { ...filters, isAuthorized }),
    enabled: !!projectIdOrSlug,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  // Convert response to unified format (no longer needs project data). Memoized
  // on `data` so the derived array keeps a stable identity across renders when
  // the underlying query result hasn't changed — otherwise the per-render
  // recompute churns every consumer's deps (DEV-396 request storm).
  const milestones = useMemo(
    () =>
      data
        ? sortByDateDescending(assignGrantMilestoneOrder(convertToUnifiedMilestones(data)))
        : EMPTY_MILESTONES,
    [data]
  );

  // Filter pending milestones (not completed)
  const pendingMilestones = useMemo(
    () => milestones.filter((m) => !m.completed && !isCancelledMilestoneStatus(m.currentStatus)),
    [milestones]
  );

  // Provide raw data for components that want to use it directly
  const rawData = data;

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
    return originalRefetch();
  }, [queryKey, originalRefetch]);

  return {
    milestones,
    pendingMilestones,
    rawData,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
