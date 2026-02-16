"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useContractOwner } from "@/hooks/useContractOwner";

function ContractOwnerBootstrap() {
  useContractOwner();
  return null;
}

const DEFAULT_PERMISSIONS_BOOTSTRAP_TIMEOUT_MS = 2_000;
const PROJECT_PERMISSIONS_BOOTSTRAP_TIMEOUT_MS = 15_000;
const PROJECT_PERMISSIONS_BOOTSTRAP_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "keydown",
  "touchstart",
];

/**
 * PermissionsProvider - Centralized permissions management
 *
 * This component initializes permission-related hooks that need to run at the app level.
 * The main permissions (isRegistryAdmin, isProgramCreator, etc.) are now fetched via
 * usePermissionsQuery directly in components that need them, rather than being synced
 * to a global store.
 */
export function PermissionsProvider() {
  const pathname = usePathname();
  const isProjectRoute = pathname?.startsWith("/project/");
  const [shouldBootstrap, setShouldBootstrap] = useState(() => process.env.NODE_ENV === "test");

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      setShouldBootstrap(true);
      return;
    }

    if (shouldBootstrap) {
      return;
    }

    const startBootstrap = () => setShouldBootstrap(true);

    if (isProjectRoute) {
      const removeInteractionListeners = () => {
        for (const eventName of PROJECT_PERMISSIONS_BOOTSTRAP_EVENTS) {
          window.removeEventListener(eventName, handleTrustedInteraction);
        }
      };
      const handleTrustedInteraction = (event: Event) => {
        if (!event.isTrusted) return;
        startBootstrap();
        removeInteractionListeners();
      };

      for (const eventName of PROJECT_PERMISSIONS_BOOTSTRAP_EVENTS) {
        window.addEventListener(eventName, handleTrustedInteraction);
      }

      const timeoutId = window.setTimeout(startBootstrap, PROJECT_PERMISSIONS_BOOTSTRAP_TIMEOUT_MS);

      return () => {
        window.clearTimeout(timeoutId);
        removeInteractionListeners();
      };
    }

    if (typeof window.requestIdleCallback === "function") {
      const idleCallbackId = window.requestIdleCallback(startBootstrap, {
        timeout: DEFAULT_PERMISSIONS_BOOTSTRAP_TIMEOUT_MS,
      });
      return () => window.cancelIdleCallback(idleCallbackId);
    }

    const timeoutId = window.setTimeout(startBootstrap, 1_000);
    return () => window.clearTimeout(timeoutId);
  }, [isProjectRoute, shouldBootstrap]);

  if (!shouldBootstrap) {
    return null;
  }

  // Check if user is contract owner (used for super admin access).
  return <ContractOwnerBootstrap />;
}
