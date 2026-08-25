"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchUserApplications } from "@/services/funding-applications";
import { getApplicationDetailUrl } from "@/utilities/fundingPlatformUrls";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseGranteeMilestoneRedirectParams {
  /** Only fire the lookup once the caller knows the user is denied. */
  enabled: boolean;
  communityId?: string;
  programId?: string;
  /** The project UID from the manage milestones route (`:projectId`). */
  projectUid?: string;
  /** Current origin in whitelabel mode, so the redirect stays on the tenant domain. */
  whitelabelOrigin?: string;
}

interface GranteeMilestoneRedirect {
  /** True while the lookup is enabled and undecided — render a spinner, not a denial. */
  isResolving: boolean;
  /**
   * The canonical application URL (milestones tab) for the viewer's own
   * application in this project, or `null` when they have none — a pure-public
   * viewer, or an applicant whose applications are for other projects, gets a
   * denial rather than a redirect (DEV-496).
   */
  redirectUrl: string | null;
}

// Applicants can legitimately hold more than one application in a program, so
// fetch a bounded page and match on projectUID rather than assuming the first.
const MAX_APPLICATIONS_TO_SCAN = 100;

/**
 * Resolves where to send a non-reviewer who opens a manage milestones link
 * (`/manage/funding-platform/:programId/milestones/:projectUid`). Only the
 * applicant who owns the application for that exact project is redirected — to
 * their canonical `/applications/:ref?tab=milestones` page. Everyone else
 * resolves to `null` so the guard shows the denial box.
 */
export function useGranteeMilestoneRedirect({
  enabled,
  communityId,
  programId,
  projectUid,
  whitelabelOrigin,
}: UseGranteeMilestoneRedirectParams): GranteeMilestoneRedirect {
  const { address, authenticated } = useAuth();
  const isEnabled = enabled && !!communityId && !!programId && !!projectUid && authenticated;

  const query = useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.GRANTEE_MILESTONE_ACCESS(
      address,
      communityId,
      programId,
      projectUid
    ),
    queryFn: () => {
      if (!communityId) throw new Error("communityId is required");
      return fetchUserApplications({
        communitySlug: communityId,
        programId,
        page: 1,
        limit: MAX_APPLICATIONS_TO_SCAN,
      });
    },
    enabled: isEnabled,
    staleTime: 1000 * 60 * 2,
  });

  // A disabled React Query v5 query reports isPending=true while idle, so only
  // treat it as resolving when enabled — avoids both a denial flash and an
  // infinite spinner for disabled callers.
  const isResolving = isEnabled ? query.isPending : false;

  const match = query.data?.applications?.find((app) => app.projectUID === projectUid);
  const redirectUrl =
    match?.referenceNumber && communityId
      ? getApplicationDetailUrl(communityId, match.referenceNumber, whitelabelOrigin, {
          tab: "milestones",
        })
      : null;

  return { isResolving, redirectUrl };
}
