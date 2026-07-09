"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

const ROUTE_PAINTED_EVENT = "dashboard:route-painted";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => unknown;
};

/** Whether the browser supports the View Transitions API. */
export function supportsViewTransitions(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof (document as ViewTransitionDocument).startViewTransition === "function"
  );
}

/**
 * Fired by each dashboard route on mount so an in-flight view transition knows
 * the destination has painted and can capture its "after" snapshot.
 */
export function signalDashboardRoutePainted(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ROUTE_PAINTED_EVENT));
  }
}

/**
 * Navigate between dashboard segments inside a View Transition so a bento tile
 * and its drill-in (which share a `view-transition-name`) morph across the
 * route change — the cross-route equivalent of the in-place framer `layoutId`
 * morph. Falls back to a plain push where the API is unavailable.
 *
 * The transition resolves when the destination route signals it has painted
 * (see `signalDashboardRoutePainted`), with a timeout backstop so a missed
 * signal can never hang the navigation.
 */
export function useDashboardTransition() {
  const router = useRouter();

  return useCallback(
    (href: string) => {
      const doc =
        typeof document !== "undefined" ? (document as ViewTransitionDocument) : undefined;
      if (!doc?.startViewTransition) {
        router.push(href);
        return;
      }
      doc.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            let settled = false;
            const finish = () => {
              if (settled) return;
              settled = true;
              window.removeEventListener(ROUTE_PAINTED_EVENT, finish);
              resolve();
            };
            window.addEventListener(ROUTE_PAINTED_EVENT, finish);
            // Backstop: never let a missed paint signal hang the navigation.
            window.setTimeout(finish, 500);
            router.push(href);
          })
      );
    },
    [router]
  );
}
