"use client";

import { usePermissionContext } from "../context/permission-context";
import { Role } from "../types";

/**
 * Bridge hook that checks if the current user is a staff member (SUPER_ADMIN).
 * Replaces direct staff address checks with RBAC role check.
 *
 * The backend determines staff status by checking if the user's address
 * is in the staff addresses list, and returns SUPER_ADMIN role if so.
 *
 * Migration:
 * ```diff
 * - const isStaff = staffAddresses.includes(address);
 * + import { useStaff } from "@/core/rbac/hooks/use-staff-bridge";
 * + const { isStaff, isLoading } = useStaff();
 * ```
 */
export function useStaff(): { isStaff: boolean; isLoading: boolean } {
  const { hasRoleOrHigher, isLoading } = usePermissionContext();

  return {
    isStaff: !isLoading && hasRoleOrHigher(Role.SUPER_ADMIN),
    isLoading,
  };
}
