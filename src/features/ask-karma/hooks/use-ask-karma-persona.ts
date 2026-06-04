"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { AskKarmaPersona } from "../types";

/**
 * Resolves the Ask Karma audience from the visitor's sign-in state and role,
 * so the start screen can surface prompts that match where they are:
 *
 * - signed out                     → `visitor`
 * - signed in + reviewer anywhere  → `reviewer`
 * - signed in (everyone else)      → `grantee`
 *
 * Reviewer status comes from `usePermissions({ role: "reviewer" })`, which
 * reports whether the connected wallet reviews any program at all — no
 * community context required, which suits this top-level page. While that
 * check is in flight we keep the `grantee` default (the common case), so the
 * prompts settle on `reviewer` once it resolves rather than flashing the
 * wrong copy first.
 */
export function useAskKarmaPersona(): AskKarmaPersona {
  const { authenticated } = useAuth();
  const { hasRole: isReviewer } = usePermissions({
    role: "reviewer",
    enabled: authenticated,
  });

  return useMemo<AskKarmaPersona>(() => {
    if (!authenticated) return "visitor";
    if (isReviewer) return "reviewer";
    return "grantee";
  }, [authenticated, isReviewer]);
}
