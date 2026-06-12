"use client";

import { useEffect, useState } from "react";
import { usePrivyBridge, usePrivyLoginAttempted } from "@/contexts/privy-bridge-context";
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
 *  - Arm only after a real login attempt (usePrivyLoginAttempted() === true). The
 *    bridge provider wraps `login` so every sign-in path in the app sets this flag;
 *    an anonymous idle session that never tries to log in has nothing to diagnose.
 *  - While armed and still unauthenticated, a PerformanceObserver corroborates the
 *    block by observing a resource entry for the Privy auth origin whose
 *    responseStatus is exactly 403 — the origin rejection.
 *    PerformanceResourceTiming.responseStatus is Chromium 109+; where unsupported,
 *    no entry will ever corroborate and the advisory simply never shows (we accept a
 *    miss over a false positive).
 *  - The 403 IS parent-observable, verified by spike on 2026-06-11 (see the
 *    "Failure signature" appendix in docs/auth/privy-preview-deployments.md):
 *    auth.privy.io answers the CORS preflight 204 and the auth API POST
 *    (e.g. /api/v1/siwe/init) with 403 {"code":"invalid_origin"} while echoing the
 *    disallowed origin in Access-Control-Allow-Origin, so the response passes the
 *    CORS check and headless Chromium reports responseStatus === 403 for the entry.
 *  - The advisory only trips on that explicit, parent-observable 403. We deliberately
 *    do NOT trip on a bare timeout or on status 0: a slow but working emailed-OTP flow
 *    routinely takes longer than any reasonable timeout, and status 0 is the normal
 *    responseStatus for no-cors subresources (e.g. the iframe document itself) even on
 *    success. Tripping on either would fire spuriously during ordinary preview QA.
 *  - The success condition (authenticated) clears everything — no false banner.
 *
 * frame-ancestors violations themselves are NOT observable from the embedding page
 * (SecurityPolicyViolationEvent fires inside the blocked iframe's own browsing
 * context), which is why detection relies on the parent-observable 403 subresource
 * rather than a CSP listener.
 */

/** Origin that serves the Privy auth iframe and the blocking frame-ancestors CSP. */
const PRIVY_AUTH_ORIGIN = "https://auth.privy.io";

/** Runbook for resolving a blocked preview origin (module-level, not inlined). */
const PRIVY_PREVIEW_RUNBOOK_URL =
  "https://github.com/show-karma/gap-app-v2/blob/main/docs/auth/privy-preview-deployments.md";

/**
 * The only status we treat as a confirmed origin rejection. Status 0 is intentionally
 * excluded: it is the normal cross-origin value for a successful subresource without a
 * Timing-Allow-Origin header, so matching it would produce false positives on a working
 * login.
 */
const ORIGIN_REJECTED_STATUS = 403;

type ResourceEntryWithStatus = PerformanceResourceTiming & {
  responseStatus?: number;
};

function isPrivyAuthBlock(entry: PerformanceEntry): boolean {
  if (entry.entryType !== "resource") return false;
  const resource = entry as ResourceEntryWithStatus;
  if (!resource.name.startsWith(PRIVY_AUTH_ORIGIN)) return false;
  // responseStatus is Chromium 109+. Where it is absent we cannot corroborate via this
  // signal, so we leave the banner hidden rather than guess.
  return resource.responseStatus === ORIGIN_REJECTED_STATUS;
}

/**
 * Renders nothing outside Vercel preview deployments. On a preview build, shows a
 * dismissible, accessible advisory once a login attempt produces an explicit Privy
 * origin rejection (HTTP 403 from auth.privy.io).
 */
export function PrivyOriginDiagnostic() {
  const loginAttempted = usePrivyLoginAttempted();
  const { authenticated } = usePrivyBridge();
  const [blocked, setBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isPreview = envVars.VERCEL_ENV === "preview";
  // Arm only after a login attempt while still unauthenticated.
  const armed = isPreview && loginAttempted && !authenticated;

  useEffect(() => {
    if (armed) return;
    // Whenever we are not armed (e.g. auth succeeded), clear any pending advisory so a
    // later successful login removes a previously shown banner.
    setBlocked(false);
  }, [armed]);

  useEffect(() => {
    if (!armed) return;
    if (typeof PerformanceObserver === "undefined") return;

    let observer: PerformanceObserver | undefined;
    try {
      observer = new PerformanceObserver((list) => {
        if (list.getEntries().some(isPrivyAuthBlock)) {
          setBlocked(true);
        }
      });
      observer.observe({ type: "resource", buffered: true });
    } catch {
      // Older engines reject the options object; without responseStatus we cannot
      // corroborate, so the advisory simply stays hidden.
      observer = undefined;
    }

    return () => {
      observer?.disconnect();
    };
  }, [armed]);

  // Derive visibility instead of mutating state during render: never show once the user
  // is authenticated, even before the clearing effect above has run.
  const visible = isPreview && blocked && !authenticated && !dismissed;
  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 border-t border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="max-w-3xl">
        Privy login is blocked on this preview origin — the deployment hostname is missing from the
        Privy allowed-origins list.{" "}
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
