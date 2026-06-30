"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserApplicationsResponse } from "@/src/features/user-applications/types";
import fetchData from "@/utilities/fetchData";
import { getApplicationDetailUrl } from "@/utilities/fundingPlatformUrls";
import { PAGES } from "@/utilities/pages";

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
  redirectUrl: string;
  applicationCount: number;
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
  const isEnabled = enabled && !!communityId;

  const query = useQuery<UserApplicationsResponse>({
    queryKey: ["grantee-application-access", communityId, programId],
    queryFn: async () => {
      const programParam = programId ? `&programId=${programId}` : "";
      const url = `/v2/funding-applications/user/my-applications?page=1&limit=1&communitySlug=${communityId}${programParam}`;
      const [res, err] = await fetchData<UserApplicationsResponse>(url, "GET");
      if (err) throw new Error(err);
      return res as UserApplicationsResponse;
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
  const isGrantee = applicationCount > 0;
  const firstReference = applications[0]?.referenceNumber;

  const redirectUrl =
    applicationCount === 1 && firstReference && communityId
      ? getApplicationDetailUrl(communityId, firstReference, whitelabelOrigin)
      : PAGES.DASHBOARD;

  return {
    isResolving,
    isGrantee,
    isError: query.isError,
    redirectUrl,
    applicationCount,
  };
}
