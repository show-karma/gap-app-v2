"use client";

import { useEffect, useState } from "react";
import { useContractOwner } from "@/hooks/useContractOwner";

function ContractOwnerBootstrap() {
  useContractOwner();
  return null;
}

/**
 * PermissionsProvider - Centralized permissions management
 *
 * This component initializes permission-related hooks that need to run at the app level.
 * The main permissions (isRegistryAdmin, isProgramCreator, etc.) are now fetched via
 * usePermissionsQuery directly in components that need them, rather than being synced
 * to a global store.
 */
export function PermissionsProvider() {
  const [shouldBootstrap, setShouldBootstrap] = useState(false);

  useEffect(() => {
    const startBootstrap = () => setShouldBootstrap(true);

    if (typeof window.requestIdleCallback === "function") {
      const idleCallbackId = window.requestIdleCallback(startBootstrap, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = window.setTimeout(startBootstrap, 1000);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!shouldBootstrap) {
    return null;
  }

  // Check if user is contract owner (used for super admin access).
  return <ContractOwnerBootstrap />;
}
