"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchUserApplications } from "@/services/funding-applications";
import { buildGranteeRedirect, type GranteeRedirect } from "@/utilities/fundingPlatformUrls";
import { QUERY_KEYS } from "@/utilities/queryKeys";

interface UseGranteeApplicationAccessParams {
  /** Only fire the lookup when the caller has already established the user is denied. */
  enabled: boolean;
  communityId?: string;
  /** When present (program-scoped routes), narrows the lookup to this program. */
  programId?: string;
  /** Current origin in whitelabel mode, so the redirect stays on the tenant domain. */
  whitelabelOrigin?: string;
}

interface GranteeApplicationAccess {
  /** True while the lookup is enabled and still undecided — render a spinner, not a denial. */
  isResolving: boolean;
  isGrantee: boolean;
  isError: boolean;
  redirect: GranteeRedirect;
}

/**
 * Applicant fallback for funding-platform manage pages that have no projectId
 * (program list, applications, setup, question-builder), and for milestone-page
 * grantees who aren't the on-chain project owner. Detects whether a denied user
 * has any application in the program/community by reading their own applications,
 * which also carry the `referenceNumber` the redirect needs.
 */
export function useGranteeApplicationAccess({
  enabled,
  communityId,
  programId,
  whitelabelOrigin,
}: UseGranteeApplicationAccessParams): GranteeApplicationAccess {
  // The endpoint is per-authenticated-user; key on the wallet so an account
  // switch doesn't serve the previous user's applications from cache.
  const { address } = useAuth();
  const isEnabled = enabled && !!communityId && !!address;

  const query = useQuery({
    queryKey: QUERY_KEYS.APPLICATIONS.GRANTEE_ACCESS(address, communityId, programId),
    queryFn: () => {
      // isEnabled already gates the query on a defined communityId; this guard
      // just narrows the type without a cast.
      if (!communityId) throw new Error("communityId is required");
      return fetchUserApplications({ communitySlug: communityId, programId, page: 1, limit: 1 });
    },
    enabled: isEnabled,
    staleTime: 1000 * 60 * 2,
  });

  // The hook owns the tri-state. A disabled React Query v5 query reports
  // isPending=true while idle, so only treat it as resolving when enabled —
  // this prevents both a denial flash and an infinite spinner for disabled callers.
  const isResolving = isEnabled ? query.isPending : false;

  const applications = query.data?.applications ?? [];
  // Use the server total, not applications.length (the page is limited to 1).
  const applicationCount = query.data?.pagination?.total ?? applications.length;

  return {
    isResolving,
    isGrantee: applicationCount > 0,
    isError: query.isError,
    redirect: buildGranteeRedirect({
      communityId,
      referenceNumber: applications[0]?.referenceNumber,
      applicationCount,
      whitelabelOrigin,
    }),
  };
}
