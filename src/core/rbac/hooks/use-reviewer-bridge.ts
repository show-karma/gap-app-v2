"use client";

import { usePermissionContext } from "../context/permission-context";
import type { ReviewerType } from "../types";

/**
 * Bridge hook that provides reviewer program information from the RBAC permission context
 * instead of making a separate API call.
 *
 * This replaces the old useReviewerPrograms hook to avoid double-fetching.
 * The RBAC permission endpoint already returns reviewer status and types.
 *
 * Migration:
 * ```diff
 * - import { useReviewerPrograms } from "@/hooks/usePermissions";
 * + import { useReviewerBridge } from "@/core/rbac/hooks/use-reviewer-bridge";
 *
 * - const { hasPrograms, isLoading } = useReviewerPrograms();
 * + const { isReviewer, isLoading } = useReviewerBridge();
 * ```
 */
export function useReviewerBridge(): {
  isReviewer: boolean;
  reviewerTypes: ReviewerType[];
  isLoading: boolean;
} {
  const { isReviewer, roles, isLoading } = usePermissionContext();

  return {
    isReviewer,
    reviewerTypes: roles.reviewerTypes ?? [],
    isLoading,
  };
}
