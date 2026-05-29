"use client";

import { useContractOwner } from "@/hooks/useContractOwner";

/**
 * PermissionsProvider - Centralized permissions management
 *
 * This component initializes permission-related hooks that need to run at the app level.
 * The main permissions (isRegistryAdmin, isProgramCreator, etc.) are now fetched via
 * usePermissionsQuery directly in components that need them, rather than being synced
 * to a global store.
 *
 * Note: useAdminCommunities is intentionally NOT mounted here — it is called by each
 * page that needs the "admin of any community" flag. React Query dedupes the fetch by
 * queryKey, so multiple subscribers share a single network request, and the hook
 * stays scoped to pages that actually need it instead of firing on every page.
 */
export function PermissionsProvider() {
  useContractOwner();

  return null;
}
