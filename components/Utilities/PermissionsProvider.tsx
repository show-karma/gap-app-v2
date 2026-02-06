"use client";

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
  // Check if user is contract owner (used for super admin access)
  useContractOwner();

  return null;
}
