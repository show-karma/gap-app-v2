"use client";

import { useOwnerStore } from "@/store/owner";
import { useProjectStore } from "@/store/project";

/**
 * Exposes Zustand store setters on window.__E2E_STORES__ for Cypress E2E tests.
 *
 * Mounted in the project layout (outside the dynamically-imported
 * ProjectProfileLayout) so stores are available even if the dynamic
 * chunk fails to load or the component crashes during hooks.
 *
 * The compile-time NEXT_PUBLIC_E2E_AUTH_BYPASS flag is inlined at build
 * time, so this entire component is dead-code-eliminated in non-E2E builds.
 */
export function E2EStoreExposer() {
  if (process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS !== "true") return null;
  if (typeof window === "undefined") return null;

  (window as Window & { __E2E_STORES__?: Record<string, unknown> }).__E2E_STORES__ = {
    ...((window as Window & { __E2E_STORES__?: Record<string, unknown> }).__E2E_STORES__ || {}),
    setIsProjectOwner: useProjectStore.getState().setIsProjectOwner,
    setIsProjectAdmin: useProjectStore.getState().setIsProjectAdmin,
    setIsOwner: useOwnerStore.getState().setIsOwner,
    setIsOwnerLoading: useOwnerStore.getState().setIsOwnerLoading,
  };

  return null;
}
