"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { useProjectStore } from "@/store";

/**
 * Project owner/admin for the current user, resolved by the BACKEND across ALL
 * linked wallets (single source of truth). Replaces the previous client-side
 * on-chain ProjectResolver checks — the backend's permissions endpoint now
 * resolves owner/admin from the project + on-chain fallback over the caller's
 * linked wallets. Keeps the previous return shape and syncs the project store.
 */
export const useProjectPermissions = () => {
  const { authenticated: isAuth } = useAuth();
  const project = useProjectStore((state) => state.project);
  const projectId = project?.details?.slug || project?.uid;
  const chainID = project?.chainID;

  const setIsProjectAdmin = useProjectStore((state) => state.setIsProjectAdmin);
  const setIsProjectOwner = useProjectStore((state) => state.setIsProjectOwner);

  const query = usePermissionsQuery(
    { projectId, chainId: chainID },
    { enabled: isAuth && Boolean(projectId) }
  );

  const isProjectOwner = isAuth ? query.data?.isProjectOwner === true : false;
  const isProjectAdmin = isAuth ? query.data?.isProjectAdmin === true : false;

  // Keep the project store in sync (many components read isProjectOwner/admin from it).
  useEffect(() => {
    // Keep the previous value only while a fetch is genuinely in flight (avoids
    // flicker on navigation). On unauthenticated OR error, fail closed to false
    // so stale owner/admin flags from a prior project/session never persist.
    if (isAuth && (query.isLoading || query.isFetching)) return;
    const hasError = Boolean(query.error);
    setIsProjectOwner(isAuth && !hasError && query.data?.isProjectOwner === true);
    setIsProjectAdmin(isAuth && !hasError && query.data?.isProjectAdmin === true);
  }, [
    isAuth,
    query.data,
    query.error,
    query.isLoading,
    query.isFetching,
    setIsProjectOwner,
    setIsProjectAdmin,
  ]);

  // Reset the GLOBAL project-permission flags whenever the active project
  // changes. These flags live in a single store shared across every project
  // page; without this reset, authorization resolved for project A stays true
  // while project B's permission query is still pending/disabled, which
  // wrongly enables admin-gated fetches (e.g. the contacts GET) for the new
  // project. The tri-state `isResolving` below keeps the UI in a loading state
  // during the recheck, so resetting here cannot reintroduce a denial flash.
  //
  // The reset MUST only fire on an actual projectId transition within this
  // instance — never on plain mount. This hook is instantiated by many
  // components (including late-mounting ones like conditional dialogs and
  // per-milestone items), and the data-sync effect above is declared first:
  // on a late mount with cached query data the sync would set the flags true
  // and an unconditional reset would immediately clobber them back to false,
  // permanently, because `query.data` never changes afterwards. Tracking the
  // previously-seen projectId in a ref skips the mount-time invocation while
  // still resetting on every real project change.
  const prevProjectIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prevProjectId = prevProjectIdRef.current;
    prevProjectIdRef.current = projectId;
    if (prevProjectId === undefined || prevProjectId === projectId) {
      return;
    }
    setIsProjectOwner(false);
    setIsProjectAdmin(false);
  }, [projectId, setIsProjectOwner, setIsProjectAdmin]);

  // Authorization is still resolving while the project loads or the backend
  // permission query is pending. In React Query v5 a disabled query reports
  // `isLoading=false` but `isPending=true`, so we read `isPending` to keep the
  // UI in a loading state through the full chain (store project sync -> backend
  // permission resolution). Guests resolve synchronously to a not-loading state.
  const isResolving = !!isAuth && (!project || query.isPending);

  return {
    isProjectOwner,
    isProjectAdmin,
    isLoading: query.isLoading,
    isResolving,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
};
