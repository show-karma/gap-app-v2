"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useReviewerPrograms } from "@/hooks/usePermissions";
import { useStaff } from "@/hooks/useStaff";
import type { FundingProgram } from "@/services/fundingPlatformService";
import { useOwnerStore } from "@/store";
import { useCommunitiesStore } from "@/store/communities";
import { useRegistryStore } from "@/store/registry";

interface NavbarPermissionsContextValue {
  // Auth state
  isLoggedIn: boolean;
  address: string | undefined;
  ready: boolean;

  // Permission states
  isStaff: boolean;
  isStaffLoading: boolean;
  isOwner: boolean;
  isCommunityAdmin: boolean;
  hasReviewerRole: boolean;
  hasAdminAccess: boolean;
  isRegistryAllowed: boolean;

  // Data
  reviewerPrograms: FundingProgram[];
  isPoolManager: boolean;
  isRegistryAdmin: boolean;
}

const NavbarPermissionsContext = createContext<NavbarPermissionsContextValue | null>(null);

interface NavbarPermissionsProviderProps {
  children: ReactNode;
}

/**
 * Provider that centralizes all permission-related hooks for the navbar.
 * This prevents duplicate API calls from multiple navbar components
 * (desktop nav, user menu, mobile menu) each calling the same hooks.
 */
export function NavbarPermissionsProvider({ children }: NavbarPermissionsProviderProps) {
  const { authenticated: isLoggedIn, address, ready } = useAuth();

  // These hooks are now called only once instead of 3x
  const { communities } = useCommunitiesStore();
  const { programs: reviewerPrograms } = useReviewerPrograms();
  const { isStaff, isLoading: isStaffLoading } = useStaff();
  const isOwner = useOwnerStore((state) => state.isOwner);
  const { isPoolManager, isRegistryAdmin } = useRegistryStore();

  // Derived permission states
  const isCommunityAdmin = communities.length !== 0;
  const hasReviewerRole = reviewerPrograms && reviewerPrograms.length > 0;
  const hasAdminAccess = !isStaffLoading && (isStaff || isOwner || isCommunityAdmin);
  const isRegistryAllowed = (isRegistryAdmin || isPoolManager) && isLoggedIn;

  const value = useMemo<NavbarPermissionsContextValue>(
    () => ({
      isLoggedIn,
      address,
      ready,
      isStaff,
      isStaffLoading,
      isOwner,
      isCommunityAdmin,
      hasReviewerRole,
      hasAdminAccess,
      isRegistryAllowed,
      reviewerPrograms: reviewerPrograms || [],
      isPoolManager,
      isRegistryAdmin,
    }),
    [
      isLoggedIn,
      address,
      ready,
      isStaff,
      isStaffLoading,
      isOwner,
      isCommunityAdmin,
      hasReviewerRole,
      hasAdminAccess,
      isRegistryAllowed,
      reviewerPrograms,
      isPoolManager,
      isRegistryAdmin,
    ]
  );

  return (
    <NavbarPermissionsContext.Provider value={value}>{children}</NavbarPermissionsContext.Provider>
  );
}

/**
 * Hook to access navbar permissions from context.
 * Must be used within NavbarPermissionsProvider.
 */
export function useNavbarPermissions(): NavbarPermissionsContextValue {
  const context = useContext(NavbarPermissionsContext);
  if (!context) {
    throw new Error("useNavbarPermissions must be used within NavbarPermissionsProvider");
  }
  return context;
}
