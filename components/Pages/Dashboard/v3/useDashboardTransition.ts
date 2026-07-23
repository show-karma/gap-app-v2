"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

const ROUTE_PAINTED_EVENT = "dashboard:route-painted";

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => unknown;
};

function viewTransitionDoc(): ViewTransitionDocument | undefined {
  if (typeof document === "undefined") return undefined;
  const doc = document as ViewTransitionDocument;
  return typeof doc.startViewTransition === "function" ? doc : undefined;
}

/** Whether the browser supports the View Transitions API. */
export function supportsViewTransitions(): boolean {
  return viewTransitionDoc() !== undefined;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
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
 * Resolve once the destination dashboard route reports it has painted (or after
 * a backstop, so a missed signal can never hang a view transition).
 */
function waitForRoutePainted(timeoutMs = 500): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener(ROUTE_PAINTED_EVENT, finish);
      resolve();
    };
    window.addEventListener(ROUTE_PAINTED_EVENT, finish);
    window.setTimeout(finish, timeoutMs);
  });
}

/**
 * Navigate between dashboard segments inside a View Transition so a bento tile
 * and its drill-in (which share a `view-transition-name`) morph across the
 * route change — the cross-route equivalent of the in-place framer `layoutId`
 * morph. Falls back to a plain push where the API is unavailable.
 */
export function useDashboardTransition() {
  const router = useRouter();

  return useCallback(
    (href: string) => {
      const doc = viewTransitionDoc();
      if (!doc) {
        router.push(href);
        return;
      }
      doc.startViewTransition(() => {
        const painted = waitForRoutePainted();
        router.push(href);
        return painted;
      });
    },
    [router]
  );
}

/**
 * Give browser Back/Forward the same morph as in-app navigation. Those fire
 * `popstate` (not a click through `useDashboardTransition`), so wrap the
 * resulting re-render in a view transition here.
 *
 * App Router re-renders a `popstate` navigation asynchronously (via a React
 * transition), so at capture-phase the old DOM is still mounted when
 * `startViewTransition` snapshots it; the transition then resolves once the
 * destination route paints. Only traversals that land on a dashboard route
 * animate — leaving the dashboard doesn't. Mounted with the dashboard route
 * tree (DashboardProvider), so the listener is removed on leave.
 */
export function useBackForwardViewTransition(): void {
  useEffect(() => {
    const doc = viewTransitionDoc();
    if (!doc) return;

    const onPopState = () => {
      if (!window.location.pathname.startsWith("/dashboard")) return;
      if (prefersReducedMotion()) return;
      doc.startViewTransition?.(() => waitForRoutePainted());
    };

    window.addEventListener("popstate", onPopState, { capture: true });
    return () => window.removeEventListener("popstate", onPopState, { capture: true });
  }, []);
}
