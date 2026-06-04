"use client";

import { useEffect } from "react";
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
    // While authenticated but still loading, leave the store untouched to avoid
    // flicker; otherwise (unauthenticated, or data ready) write resolved flags.
    if (isAuth && !query.data) return;
    setIsProjectOwner(isAuth && query.data?.isProjectOwner === true);
    setIsProjectAdmin(isAuth && query.data?.isProjectAdmin === true);
  }, [query.data, isAuth, setIsProjectOwner, setIsProjectAdmin]);

  return {
    isProjectOwner,
    isProjectAdmin,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
};
