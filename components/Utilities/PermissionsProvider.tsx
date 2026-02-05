"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useContractOwner } from "@/hooks/useContractOwner";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { useRegistryStore } from "@/store/registry";

/**
 * PermissionsProvider - Centralized permissions management
 *
 * This component uses the backend's /v2/auth/permissions endpoint to get
 * all permission-related flags in a single API call, including:
 * - isRegistryAdmin: Whether user is a member of Karma Allo profile (on-chain check done by backend)
 * - isProgramCreator: Whether user has created programs in the registry (replaces checkIsPoolManager)
 *
 * This consolidates what was previously 2 separate API calls into 1.
 */
export function PermissionsProvider() {
  const { address, isConnected } = useAuth();
  useContractOwner();

  const {
    setIsRegistryAdmin,
    setIsPoolManager,
    setIsRegistryAdminLoading,
    setIsPoolManagerLoading,
  } = useRegistryStore();

  // Use the permissions query - it already fetches from /v2/auth/permissions
  const { data: permissions, isLoading } = usePermissionsQuery(
    {},
    { enabled: isConnected && !!address }
  );

  useEffect(() => {
    // Set loading states
    setIsRegistryAdminLoading(isLoading);
    setIsPoolManagerLoading(isLoading);

    if (!address || !isConnected) {
      setIsRegistryAdmin(false);
      setIsPoolManager(false);
      return;
    }

    if (!isLoading && permissions) {
      // Use the backend's computed values instead of making separate API calls
      setIsRegistryAdmin(permissions.isRegistryAdmin ?? false);
      // isProgramCreator replaces the old "pool manager" concept
      setIsPoolManager(permissions.isProgramCreator ?? false);
    }
  }, [
    address,
    isConnected,
    permissions,
    isLoading,
    setIsPoolManager,
    setIsRegistryAdmin,
    setIsRegistryAdminLoading,
    setIsPoolManagerLoading,
  ]);

  return null;
}
