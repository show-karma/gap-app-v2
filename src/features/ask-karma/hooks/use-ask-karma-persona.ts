"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import type { AskKarmaPersona } from "../types";

interface AdminCommunitiesResponse {
  communities?: unknown[];
}

/**
 * Whether the connected wallet administers any community. The Ask Karma page
 * isn't always community-scoped, so we can't lean on the context RBAC
 * (`isCommunityAdmin`) — we read the cross-community admin list directly.
 *
 * Deliberately lightweight: just the list, no per-community metrics fan-out
 * (unlike `useDashboardAdmin`) and no global-store writes (unlike
 * `useAdminCommunities`) — this only needs a boolean to pick prompt chips.
 */
function useIsCommunityAdminAnywhere(): boolean {
  const { authenticated, address } = useAuth();
  const { data } = useQuery({
    queryKey: ["ask-karma-admin-communities", address],
    enabled: Boolean(authenticated && address),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [response] = await fetchData<AdminCommunitiesResponse>(
        INDEXER.V2.USER.ADMIN_COMMUNITIES()
      );
      return (response?.communities?.length ?? 0) > 0;
    },
  });
  return data ?? false;
}

/**
 * Resolves the Ask Karma audience from the visitor's sign-in state and role,
 * so the start screen can surface prompts that match where they are:
 *
 * - signed out                           → `visitor`
 * - signed in + reviewer OR community admin → `reviewer`
 * - signed in (everyone else)            → `grantee`
 *
 * Reviewers and community admins share the same prompt set: both ask
 * operational, review-side questions (pending reviews, evaluation criteria,
 * access) rather than grantee questions about submitting their own work.
 *
 * Both role checks are top-level (no community context required), which suits
 * this page. While they're in flight we keep the `grantee` default (the common
 * case), so prompts settle on `reviewer` once a role resolves rather than
 * flashing the wrong copy first.
 */
export function useAskKarmaPersona(): AskKarmaPersona {
  const { authenticated } = useAuth();
  const { hasRole: isReviewer } = usePermissions({
    role: "reviewer",
    enabled: authenticated,
  });
  const isCommunityAdmin = useIsCommunityAdminAnywhere();

  return useMemo<AskKarmaPersona>(() => {
    if (!authenticated) return "visitor";
    if (isReviewer || isCommunityAdmin) return "reviewer";
    return "grantee";
  }, [authenticated, isReviewer, isCommunityAdmin]);
}
