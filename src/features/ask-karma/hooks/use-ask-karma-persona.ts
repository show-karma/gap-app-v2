"use client";

import { useMemo } from "react";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { AskKarmaPersona } from "../types";

/**
 * Resolves the Ask Karma audience from the visitor's sign-in state and role,
 * so the start screen can surface prompts that match where they are:
 *
 * - signed out                              → `visitor`
 * - signed in + reviewer OR admin of tenant → `reviewer`
 * - signed in (everyone else)               → `grantee`
 *
 * Reviewers and community admins share the same prompt set: both ask
 * operational, review-side questions (pending reviews, evaluation criteria,
 * access) rather than grantee questions about submitting their own work.
 *
 * Admin status is scoped to the page's own community (`communityId` — the
 * whitelabel tenant or the `/community/[id]` route). Being an admin of some
 * *other* community is irrelevant here, so this only flips to `reviewer` for
 * admins of the community whose Ask Karma page they're on. Reviewer status is
 * program-level (no community scope), which is the only signal available.
 *
 * While the role checks are in flight we keep the `grantee` default (the
 * common case), so prompts settle on `reviewer` once a role resolves rather
 * than flashing the wrong copy first.
 */
export function useAskKarmaPersona(communityId?: string): AskKarmaPersona {
  const { authenticated } = useAuth();
  const { hasRole: isReviewer } = usePermissions({
    role: "reviewer",
    enabled: authenticated,
  });
  const { isCommunityAdmin } = useIsCommunityAdmin(communityId, undefined, {
    enabled: Boolean(authenticated && communityId),
  });

  return useMemo<AskKarmaPersona>(() => {
    if (!authenticated) return "visitor";
    if (isReviewer || isCommunityAdmin) return "reviewer";
    return "grantee";
  }, [authenticated, isReviewer, isCommunityAdmin]);
}
