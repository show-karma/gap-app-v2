"use client";

import { useAdminCommunities } from "@/hooks/useAdminCommunities";
import { useAuth } from "@/hooks/useAuth";
import { useContractOwner } from "@/hooks/useContractOwner";

/**
 * PermissionsProvider - Centralized permissions management
 *
 * This component initializes permission-related hooks that need to run at the app level.
 * The main permissions (isRegistryAdmin, isProgramCreator, etc.) are now fetched via
 * usePermissionsQuery directly in components that need them, rather than being synced
 * to a global store.
 */
export function PermissionsProvider() {
  const { address } = useAuth();

  useContractOwner();
  useAdminCommunities(address);

  return null;
}
