"use client";

import { useEffect, useState } from "react";
import { usePrivyBridge, usePrivyLoadRequested } from "@/contexts/privy-bridge-context";
import { envVars } from "@/utilities/enviromentVars";

/**
 * Preview-only advisory that surfaces the silent Privy "blocked origin" failure
 * documented in show-karma/gap-app-v2#1193 (and its prior recurrence #1176).
 *
 * Vercel preview deployments mint unbounded unique hostnames; any hostname absent
 * from the Privy app's Allowed Origins list is rejected by a frame-ancestors CSP
 * served by auth.privy.io, so the auth iframe is blocked and login silently fails.
 * The durable fix is operational (a wildcard preview origin on a dev Privy app — see
 * the runbook), but until a deployment is allowlisted the failure is invisible to the
 * user. This component makes it visible on preview builds only.
 *
 * Detection (variant B, per the #1176 evidence that the email field renders inline
 * and only the subsequent OTP/wallet iframe step fails — i.e. the bridge reaches
 * ready=true before the block manifests):
 *  - Arm only after a login attempt (usePrivyLoadRequested() === true), since an
 *    anonymous idle session that never tries to log in has nothing to diagnose.
 *  - While armed and still unauthenticated, a PerformanceObserver corroborates the
 *    block by observing a resource entry for the Privy auth origin whose
 *    responseStatus is 403 (frame-ancestors rejection) or 0 (opaque/blocked).
 *    PerformanceResourceTiming.responseStatus is Chromium 109+; where unsupported
 *    we degrade to a timeout-only path.
 *  - If no corroborating entry arrives, a generous timeout fires the advisory anyway,
 *    which also covers the variant-A failure mode (ready stalls) on engines that do
 *    not expose responseStatus.
 *  - The success condition (authenticated) cancels everything — no false banner.
 *
 * frame-ancestors violations themselves are NOT observable from the embedding page
 * (SecurityPolicyViolationEvent fires inside the blocked iframe's own browsing
 * context), which is why detection relies on the parent-observable 403 subresource
 * plus the authentication-never-completes timeout rather than a CSP listener.
 */

/** Origin that serves the Privy auth iframe and the blocking frame-ancestors CSP. */
const PRIVY_AUTH_ORIGIN = "https://auth.privy.io";

/**
 * How long to wait after a login attempt before assuming the auth iframe is blocked.
 * Generous so a slow connection completing login cancels the advisory first; copy
 * says "likely" because ad-blocker stalls can mimic the same signature.
 */
const PRIVY_BLOCK_TIMEOUT_MS = 15_000;

/** Runbook for resolving a blocked preview origin (module-level, not inlined). */
const PRIVY_PREVIEW_RUNBOOK_URL =
  "https://github.com/show-karma/gap-app-v2/blob/main/docs/auth/privy-preview-deployments.md";

/** Response statuses that indicate the Privy auth subresource was blocked/rejected. */
const BLOCKED_RESPONSE_STATUSES = new Set([0, 403]);

type ResourceEntryWithStatus = PerformanceResourceTiming & {
  responseStatus?: number;
};

function isPrivyAuthBlock(entry: PerformanceEntry): boolean {
  if (entry.entryType !== "resource") return false;
  const resource = entry as ResourceEntryWithStatus;
  if (!resource.name.startsWith(PRIVY_AUTH_ORIGIN)) return false;
  // responseStatus is Chromium 109+. Where it is absent we cannot corroborate via
  // this signal, so we leave the decision to the timeout path.
  if (typeof resource.responseStatus !== "number") return false;
  return BLOCKED_RESPONSE_STATUSES.has(resource.responseStatus);
}

/**
 * Renders nothing outside Vercel preview deployments. On a preview build, shows a
 * dismissible, accessible advisory when a login attempt appears blocked by a missing
 * Privy allowed-origin.
 */
export function PrivyOriginDiagnostic() {
  const loadRequested = usePrivyLoadRequested();
  const { authenticated } = usePrivyBridge();
  const [blocked, setBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isPreview = envVars.VERCEL_ENV === "preview";
  // Arm only after a login attempt while still unauthenticated.
  const armed = isPreview && loadRequested && !authenticated;

  useEffect(() => {
    if (!armed) return;

    let settled = false;
    const trip = () => {
      if (settled) return;
      settled = true;
      setBlocked(true);
    };

    const timer = setTimeout(trip, PRIVY_BLOCK_TIMEOUT_MS);

    let observer: PerformanceObserver | undefined;
    if (typeof PerformanceObserver !== "undefined") {
      try {
        observer = new PerformanceObserver((list) => {
          if (list.getEntries().some(isPrivyAuthBlock)) {
            trip();
          }
        });
        observer.observe({ type: "resource", buffered: true });
      } catch {
        // Older engines reject the options object; the timeout path still applies.
        observer = undefined;
      }
    }

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [armed]);

  // Success cancels any pending advisory.
  if (authenticated && blocked) {
    setBlocked(false);
  }

  if (!isPreview || !blocked || dismissed) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 border-t border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="max-w-3xl">
        Privy login appears blocked on this preview origin — the deployment hostname is likely
        missing from the Privy allowed-origins list.{" "}
        <a
          href={PRIVY_PREVIEW_RUNBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-200"
        >
          View the preview-deployment runbook
        </a>
        .
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss Privy preview origin warning"
        className="shrink-0 self-start rounded-md border border-amber-400 px-3 py-1 font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-600 dark:text-amber-100 dark:hover:bg-amber-900 sm:self-auto"
      >
        Dismiss
      </button>
    </div>
  );
}
