"use client";

import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useOwnerStore, useProjectStore } from "@/store";

export interface ProjectAuthorization {
  /** Whether the current user may edit/delete project content. */
  isAuthorized: boolean;
  /**
   * Whether authorization is still being resolved. Consumers MUST render a
   * skeleton (never denial UI, never the authorized controls) while this is
   * true — otherwise a slow on-chain/permission check flashes the wrong state.
   */
  isLoading: boolean;
}

/**
 * Tri-state authorization for project/grant content (edit, delete, complete).
 *
 * Authorization is NOT a synchronous boolean: it is resolved from four async
 * signals (project owner, project admin, EAS resolver super-admin, community
 * admin). Reading those signals without their pending state is the root cause
 * of the "controls pop in 1-3s late" bug (#1185) and the admin-gated-fetch
 * 403 noise (#1581). This hook exposes loading-vs-resolved in the type
 * signature so every consumer must decide what to render while undecided.
 *
 * Composition rules:
 * - `!ready`                      -> `{ false, true }` (Privy still booting)
 * - `ready && !authenticated`     -> `{ false, false }` synchronously: guests
 *   see public UI with zero skeleton (every auth signal is enabled-gated on
 *   authentication, and `useContractOwner` clears `isOwnerLoading` for guests).
 * - authenticated                 -> any resolved grant wins immediately;
 *   only undecided authenticated users see loading. The loading flag uses
 *   `isPending`-aware composition (see useProjectPermissions / useIsCommunityAdmin)
 *   so it survives React Query v5's disabled-query semantics.
 *
 * Signals:
 * - `isOwner`        — global EAS resolver super-admin (not the project owner)
 * - `isProjectAdmin` — on-chain `isAdmin()` result
 * - `isProjectOwner` — ownership resolved via `compareAllWallets`, covering
 *   email/embedded-wallet owners and multi-wallet accounts
 * - `isCommunityAdmin` — on-chain community-admin check (grant-scoped consumers
 *   pass the grant's `communityUID`)
 *
 * @param communityUID Optional community UID for grant-scoped authorization.
 */
export function useProjectAuthorization(communityUID?: string): ProjectAuthorization {
  const { ready, authenticated } = useAuth();

  const isContractOwner = useOwnerStore((state) => state.isOwner);
  const isOwnerLoading = useOwnerStore((state) => state.isOwnerLoading);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);

  const permissions = useProjectPermissions();
  const community = useIsCommunityAdmin(communityUID);

  if (!ready) {
    return { isAuthorized: false, isLoading: true };
  }

  if (!authenticated) {
    return { isAuthorized: false, isLoading: false };
  }

  const isAuthorized =
    isProjectOwner ||
    isProjectAdmin ||
    isContractOwner ||
    permissions.isProjectOwner ||
    permissions.isProjectAdmin ||
    community.isCommunityAdmin;

  // Any resolved grant wins immediately — a user already authorized by a fast
  // signal never sees a skeleton. Only undecided authenticated users do.
  const isLoading =
    !isAuthorized && (isOwnerLoading || permissions.isResolving || community.isResolving);

  return { isAuthorized, isLoading };
}
