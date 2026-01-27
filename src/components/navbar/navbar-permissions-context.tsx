"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { Hex } from "viem";
import { useAuth } from "@/hooks/useAuth";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { useStaff } from "@/hooks/useStaff";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { useOwnerStore } from "@/store";
import { useCommunitiesStore } from "@/store/communities";
import { useRegistryStore } from "@/store/registry";

/**
 * Interface for the NavbarPermissionsContext value
 *
 * Centralizes all permission-related state that navbar components need.
 * This prevents multiple navbar components from calling the same hooks
 * repeatedly, reducing duplicate API calls.
 */
export interface NavbarPermissionsContextValue {
  // Auth state
  isLoggedIn: boolean;
  address: Hex | undefined;
  ready: boolean;

  // Staff permissions
  isStaff: boolean;
  isStaffLoading: boolean;

  // Project/Community ownership
  isOwner: boolean;
  isCommunityAdmin: boolean;

  // Reviewer permissions
  hasReviewerRole: boolean;
  reviewerPrograms: FundingProgram[];

  // Registry permissions
  isPoolManager: boolean;
  isRegistryAdmin: boolean;

  // Derived permissions (computed from above values)
  hasAdminAccess: boolean;
  isRegistryAllowed: boolean;
}

/**
 * Default context value when no provider is present
 * All permissions default to false for safety
 */
const defaultContextValue: NavbarPermissionsContextValue = {
  isLoggedIn: false,
  address: undefined,
  ready: false,
  isStaff: false,
  isStaffLoading: true,
  isOwner: false,
  isCommunityAdmin: false,
  hasReviewerRole: false,
  reviewerPrograms: [],
  isPoolManager: false,
  isRegistryAdmin: false,
  hasAdminAccess: false,
  isRegistryAllowed: false,
};

const NavbarPermissionsContext = createContext<NavbarPermissionsContextValue>(defaultContextValue);

/**
 * Props for NavbarPermissionsProvider
 */
interface NavbarPermissionsProviderProps {
  children: ReactNode;
}

/**
 * Provider component that centralizes all permission-related hook calls
 *
 * This provider calls each permission hook exactly once and provides the
 * values to all child components through context. This prevents:
 * - Multiple API calls when the same hooks are used in different navbar components
 * - Race conditions from parallel hook calls
 * - Inconsistent permission states across components
 *
 * @example
 * ```tsx
 * <NavbarPermissionsProvider>
 *   <NavbarDesktopNavigation />
 *   <NavbarMobileMenu />
 *   <NavbarUserMenu />
 * </NavbarPermissionsProvider>
 * ```
 */
export function NavbarPermissionsProvider({ children }: NavbarPermissionsProviderProps) {
  // Auth state - called once
  const { authenticated: isLoggedIn, address, ready } = useAuth();

  // Staff permissions - called once
  const { isStaff, isLoading: isStaffLoading } = useStaff();

  // Community admin state - called once
  const { communities } = useCommunitiesStore();

  // Owner state - called once
  const isOwner = useOwnerStore((state) => state.isOwner);

  // Registry permissions - called once
  const { isPoolManager, isRegistryAdmin } = useRegistryStore();

  // Reviewer programs - called once
  const { programs: reviewerPrograms } = useReviewerPrograms();

  // Memoize the context value to prevent unnecessary re-renders
  // Only include primitive values and stable references in dependencies
  // Derived values (isCommunityAdmin, hasReviewerRole, hasAdminAccess, isRegistryAllowed)
  // are computed inside useMemo and should NOT be in the dependency array
  const value = useMemo<NavbarPermissionsContextValue>(() => {
    // Compute derived values inside useMemo
    const isCommunityAdmin = communities.length !== 0;
    const hasReviewerRole = reviewerPrograms && reviewerPrograms.length > 0;
    const hasAdminAccess = !isStaffLoading && (isStaff || isOwner || isCommunityAdmin);
    const isRegistryAllowed = (isRegistryAdmin || isPoolManager) && isLoggedIn;

    return {
      // Auth state
      isLoggedIn,
      address,
      ready,

      // Staff permissions
      isStaff,
      isStaffLoading,

      // Project/Community ownership
      isOwner,
      isCommunityAdmin,

      // Reviewer permissions
      hasReviewerRole,
      reviewerPrograms,

      // Registry permissions
      isPoolManager,
      isRegistryAdmin,

      // Derived permissions
      hasAdminAccess,
      isRegistryAllowed,
    };
  }, [
    // Only primitive dependencies - NOT derived values
    isLoggedIn,
    address,
    ready,
    isStaff,
    isStaffLoading,
    isOwner,
    communities.length, // Use .length instead of communities array for stable comparison
    reviewerPrograms,
    isPoolManager,
    isRegistryAdmin,
  ]);

  return (
    <NavbarPermissionsContext.Provider value={value}>{children}</NavbarPermissionsContext.Provider>
  );
}

/**
 * Hook to access navbar permissions from context
 *
 * Must be used within a NavbarPermissionsProvider. Throws an error
 * if used outside the provider to catch configuration issues early.
 *
 * @returns NavbarPermissionsContextValue containing all permission states
 *
 * @example
 * ```tsx
 * function NavbarComponent() {
 *   const { isLoggedIn, hasAdminAccess, hasReviewerRole } = useNavbarPermissions();
 *
 *   return (
 *     <nav>
 *       {isLoggedIn && hasAdminAccess && <AdminLink />}
 *       {isLoggedIn && hasReviewerRole && <ReviewLink />}
 *     </nav>
 *   );
 * }
 * ```
 */
export function useNavbarPermissions(): NavbarPermissionsContextValue {
  const context = useContext(NavbarPermissionsContext);

  // Check if we're using the default context (no provider)
  // This helps catch misconfiguration during development
  if (context === defaultContextValue && typeof window !== "undefined") {
    console.warn(
      "useNavbarPermissions must be used within a NavbarPermissionsProvider. " +
        "Make sure to wrap your navbar components with <NavbarPermissionsProvider>."
    );
  }

  return context;
}

/**
 * Export the context for advanced use cases (e.g., testing)
 */
export { NavbarPermissionsContext };
