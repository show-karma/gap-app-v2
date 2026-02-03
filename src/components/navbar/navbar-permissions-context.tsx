"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { Hex } from "viem";
import { useAuth } from "@/hooks/useAuth";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { Role } from "@/src/core/rbac/types";
import { useOwnerStore } from "@/store";
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

  // Context-aware permissions from RBAC
  isAdmin: boolean;
  isReviewer: boolean;

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
  isAdmin: false,
  isReviewer: false,
  isPoolManager: false,
  isRegistryAdmin: false,
  hasAdminAccess: false,
  isRegistryAllowed: false,
};

const NavbarPermissionsContext = createContext<NavbarPermissionsContextValue>(defaultContextValue);

interface NavbarPermissionsProviderProps {
  children: ReactNode;
}

/**
 * Provider component that centralizes all permission-related hook calls
 *
 * This provider calls each permission hook exactly once and provides the
 * values to all child components through context.
 */
export function NavbarPermissionsProvider({ children }: NavbarPermissionsProviderProps) {
  const { authenticated: isLoggedIn, address, ready } = useAuth();

  // RBAC permissions (global context - no specific community/program)
  const { data: permissions, isLoading: isPermissionsLoading } = usePermissionsQuery(
    {},
    { enabled: isLoggedIn }
  );

  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isPoolManager, isRegistryAdmin } = useRegistryStore();

  const value = useMemo<NavbarPermissionsContextValue>(() => {
    const isStaff = permissions?.roles.roles.includes(Role.SUPER_ADMIN) ?? false;
    const isAdmin = permissions?.isAdmin ?? false;
    const isReviewer = permissions?.isReviewer ?? false;
    const hasAdminAccess = !isPermissionsLoading && (isStaff || isOwner || isAdmin);
    const isRegistryAllowed = (isRegistryAdmin || isPoolManager) && isLoggedIn;

    return {
      isLoggedIn,
      address,
      ready,
      isStaff,
      isStaffLoading: isPermissionsLoading,
      isOwner,
      isAdmin,
      isReviewer,
      isPoolManager,
      isRegistryAdmin,
      hasAdminAccess,
      isRegistryAllowed,
    };
  }, [
    isLoggedIn,
    address,
    ready,
    permissions,
    isPermissionsLoading,
    isOwner,
    isPoolManager,
    isRegistryAdmin,
  ]);

  return (
    <NavbarPermissionsContext.Provider value={value}>{children}</NavbarPermissionsContext.Provider>
  );
}

/**
 * Hook to access navbar permissions from context
 */
export function useNavbarPermissions(): NavbarPermissionsContextValue {
  const context = useContext(NavbarPermissionsContext);

  if (context === defaultContextValue && typeof window !== "undefined") {
    console.warn(
      "useNavbarPermissions must be used within a NavbarPermissionsProvider. " +
        "Make sure to wrap your navbar components with <NavbarPermissionsProvider>."
    );
  }

  return context;
}

export { NavbarPermissionsContext };
