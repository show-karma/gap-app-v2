"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePermissionContext } from "@/src/core/rbac/context/permission-context";
import { ReviewerType } from "@/src/core/rbac/types";
import { PAGES } from "@/utilities/pages";

/**
 * Redirect-only guard mounted on the /manage root.
 *
 * Review-only users (a Program and/or Milestone reviewer with NO
 * community-admin rights) have no dashboard to land on, so we send them
 * straight to their Action Items. Admins keep the dashboard.
 *
 * Only fires once roles are resolved (never while loading) and only on the
 * /manage root, so the redirect cannot loop (action items is a different path).
 * Renders nothing.
 */
export function ReviewerLandingRedirect() {
  const params = useParams();
  const communityId = params.communityId as string;
  const router = useRouter();
  const { isLoading, isCommunityAdmin, isReviewerType } = usePermissionContext();

  const isProgramReviewer = isReviewerType(ReviewerType.PROGRAM);
  const isMilestoneReviewer = isReviewerType(ReviewerType.MILESTONE);
  const shouldRedirect =
    !isLoading && !isCommunityAdmin && (isProgramReviewer || isMilestoneReviewer);

  useEffect(() => {
    if (shouldRedirect) {
      router.replace(PAGES.MANAGE.ACTION_ITEMS(communityId));
    }
  }, [shouldRedirect, communityId, router]);

  return null;
}
