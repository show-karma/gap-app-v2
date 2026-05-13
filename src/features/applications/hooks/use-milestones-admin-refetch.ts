"use client";

import { useEffect } from "react";

interface UseMilestonesAdminRefetchArgs {
  /**
   * True when the admin's Milestones tab is the active tab. The hook
   * is otherwise a no-op — we don't want background refetches firing
   * for admins looking at the Application or Comments tabs.
   */
  isActive: boolean;
  /**
   * `useApplication().refetch` — the React Query refetch handle. The
   * application-detail endpoint is the source of `milestoneStatuses[]`,
   * so refetching the whole application is the simplest way to pick up
   * grantee-side state changes (a milestone got completed/verified by
   * someone else while the admin had the tab open).
   */
  refetch: () => unknown;
  /**
   * Polling cadence. Default 60s. The admin tab is low-traffic and
   * milestone state changes are infrequent — sub-minute polling would
   * be wasteful.
   */
  intervalMs?: number;
}

/**
 * Keep the admin Milestones tab fresh on long-lived sessions.
 *
 * Two refresh triggers:
 *   1. `visibilitychange` → refetch when the tab becomes visible (admin
 *      came back from another browser tab/window).
 *   2. `setInterval(refetch, intervalMs)` → periodic background poll.
 *
 * Both are gated by `isActive` so the hook is a no-op when the admin
 * isn't viewing the Milestones tab. Cleanup tears both down on unmount
 * and on `isActive` flipping false.
 *
 * Whitelabel/grantee surfaces don't use this hook — `router.refresh()`
 * from the submit hook keeps their own view in sync.
 */
export function useMilestonesAdminRefetch({
  isActive,
  refetch,
  intervalMs = 60_000,
}: UseMilestonesAdminRefetchArgs): void {
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    // Skip the periodic poll when the tab is hidden — visibilitychange
    // catches the return-to-foreground case, so a hidden tab doesn't
    // need 60s background refetches piling up. Same as the
    // visibilitychange handler: only fire on visible.
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    }, intervalMs);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [isActive, refetch, intervalMs]);
}
