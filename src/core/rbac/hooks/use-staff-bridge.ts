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
 *
 * Tri-state, not boolean. `isLoading` means "undecided", `isError` means
 * "could not be decided" (the permissions fetch timed out or failed). Both
 * report `isStaff: false` — staff status is granted only on a resolved,
 * successful answer. Callers must render `isError` as a visible, retryable
 * failure rather than silently treating the viewer as a non-staff member,
 * otherwise a real super-admin quietly loses their controls with no
 * explanation.
 */
export function useStaff(): { isStaff: boolean; isLoading: boolean; isError: boolean } {
  const { hasRoleOrHigher, isLoading, isGuestDueToError } = usePermissionContext();

  return {
    // `isGuestDueToError` also covers the stale-data case: React Query keeps
    // the last successful payload when a refetch fails, so without this guard
    // an unresolvable refetch would keep granting privileges off a cached answer.
    isStaff: !isLoading && !isGuestDueToError && hasRoleOrHigher(Role.SUPER_ADMIN),
    isLoading,
    isError: isGuestDueToError,
  };
}
