"use client";

import { useMemo } from "react";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import type { AskKarmaPersona } from "../types";

/**
 * True when the caller reviews a program belonging to `communityId`. The
 * reviewer-programs list isn't community-scoped server-side, but each program
 * carries its community, so we filter client-side. `communityId` is matched
 * against both the slug and UID since the page receives a slug from the
 * `/community/[id]` route but a UID is possible too.
 *
 * With no community in scope (the generic Karma root, not a tenant) we fall
 * back to "reviews any program" — there's no tenant to filter against, so any
 * reviewer relationship is the relevant signal there.
 */
function isReviewerForCommunity(
  programs: Array<{ communitySlug?: string; communityUID?: string }>,
  communityId?: string
): boolean {
  if (!communityId) return programs.length > 0;
  const target = communityId.toLowerCase();
  return programs.some(
    (program) =>
      program.communitySlug?.toLowerCase() === target ||
      program.communityUID?.toLowerCase() === target
  );
}

/**
 * Resolves the Ask Karma audience from the visitor's sign-in state and role,
 * so the start screen can surface prompts that match where they are:
 *
 * - signed out                                  → `visitor`
 * - signed in + reviewer OR admin of the tenant → `reviewer`
 * - signed in (everyone else)                   → `grantee`
 *
 * Reviewers and community admins share the same prompt set: both ask
 * operational, review-side questions (pending reviews, evaluation criteria,
 * access) rather than grantee questions about submitting their own work.
 *
 * Both role checks are scoped to the page's own community (`communityId` — the
 * whitelabel tenant or the `/community/[id]` route): being a reviewer or admin
 * of some *other* community is irrelevant to which prompts belong on this
 * tenant's page.
 *
 * While the role checks are in flight we keep the `grantee` default (the
 * common case), so prompts settle on `reviewer` once a role resolves rather
 * than flashing the wrong copy first.
 */
export function useAskKarmaPersona(communityId?: string): AskKarmaPersona {
  const { authenticated } = useAuth();
  // useReviewerPrograms gates its own query on auth + a connected address.
  const { programs } = useReviewerPrograms();
  const { isCommunityAdmin } = useIsCommunityAdmin(communityId, undefined, {
    enabled: Boolean(authenticated && communityId),
  });

  const isReviewer = useMemo(
    () => isReviewerForCommunity(programs, communityId),
    [programs, communityId]
  );

  return useMemo<AskKarmaPersona>(() => {
    if (!authenticated) return "visitor";
    if (isReviewer || isCommunityAdmin) return "reviewer";
    return "grantee";
  }, [authenticated, isReviewer, isCommunityAdmin]);
}
