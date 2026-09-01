"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivyBridge } from "@/contexts/privy-bridge-context";
import { isAllowedBridgeOrigin } from "@/utilities/token-bridge/origins";
import {
  isTokenBridgeRequest,
  TOKEN_BRIDGE_MESSAGE,
  type TokenBridgeReady,
  type TokenBridgeResponse,
} from "../protocol";

interface TokenBridgeProps {
  /** Origins this bridge may answer. Empty means the host has no embedder. */
  origins: readonly string[];
}

/**
 * Where the `ready` announcement is posted.
 *
 * postMessage needs a literal target origin, and silently drops the message
 * when the parent is not that origin — so the literal allowlist entries are
 * each tried, and only the real parent receives it. Wildcard entries cannot be
 * targets; for those, the parent is identified from the referrer, which the
 * browser sets to the framing document. A referrer outside the allowlist is
 * not a target: it would be dropped anyway, but there is no reason to try.
 */
function announcementTargets(origins: readonly string[]): string[] {
  const literal = origins.filter((origin) => !origin.includes("*"));
  if (typeof document === "undefined" || !document.referrer) return literal;
  try {
    const referrer = new URL(document.referrer).origin;
    if (isAllowedBridgeOrigin(referrer, origins) && !literal.includes(referrer)) {
      return [...literal, referrer];
    }
  } catch {
    // SUPPRESSED: an unparsable referrer just means no extra target.
  }
  return literal;
}

/**
 * Hands the signed-in visitor's access token to the page framing this one.
 *
 * A Privy session is origin-scoped, so a tenant's marketing site cannot read
 * it. The site frames this route instead: being same-site, the frame shares
 * the app's unpartitioned storage, so Privy rehydrates the real session here,
 * and the site asks for a token over postMessage. Every request is checked
 * against the tenant's allowlist before it is answered, and the answer is
 * posted back to exactly the origin that asked.
 *
 * What the site gets is the same short-lived access token the app itself sends
 * as a bearer, freshly refreshed by Privy on each request. Nothing is cached
 * here and nothing is written anywhere the site could read without asking.
 */
export function TokenBridge({ origins }: TokenBridgeProps) {
  const { ready, authenticated, getAccessToken } = usePrivyBridge();
  const [framed, setFramed] = useState<boolean | null>(null);

  // Handlers read the latest auth state through a ref so a request that
  // arrives before Privy is ready can wait and then act on the current values.
  const auth = useRef({ ready, authenticated, getAccessToken });
  auth.current = { ready, authenticated, getAccessToken };
  const readyWaiters = useRef<Array<() => void>>([]);

  useEffect(() => {
    setFramed(window.parent !== window);
  }, []);

  // Release anyone waiting on Privy, and tell the parent where things stand —
  // on first ready and on every later flip of the signed-in state.
  useEffect(() => {
    if (!ready) return;
    for (const release of readyWaiters.current.splice(0)) release();
    if (window.parent === window || origins.length === 0) return;

    const announcement: TokenBridgeReady = {
      type: TOKEN_BRIDGE_MESSAGE.ready,
      authenticated,
    };
    for (const target of announcementTargets(origins)) {
      window.parent.postMessage(announcement, target);
    }
  }, [ready, authenticated, origins]);

  useEffect(() => {
    if (window.parent === window || origins.length === 0) return;

    const onMessage = async (event: MessageEvent) => {
      if (!isAllowedBridgeOrigin(event.origin, origins)) return;
      if (!isTokenBridgeRequest(event.data)) return;
      const source = event.source;
      if (!source || !("postMessage" in source)) return;

      if (!auth.current.ready) {
        await new Promise<void>((release) => readyWaiters.current.push(release));
      }

      let token: string | null = null;
      if (auth.current.authenticated) {
        try {
          token = await auth.current.getAccessToken();
        } catch {
          // SUPPRESSED: a failed refresh is answered as "no token"; the site
          // then asks as a visitor, which is its fallback for every failure.
          token = null;
        }
      }

      const response: TokenBridgeResponse = {
        type: TOKEN_BRIDGE_MESSAGE.response,
        id: event.data.id,
        token,
      };
      (source as Window).postMessage(response, event.origin);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origins]);

  // Visible copy only matters when someone opens the route directly; framed,
  // the document is hidden by the embedder. Kept minimal on purpose.
  if (framed === false) {
    return (
      <main className="mx-auto max-w-md p-8 text-sm text-gray-600 dark:text-gray-400">
        <h1 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
          Session bridge
        </h1>
        <p>
          This page lets a site we operate continue your signed-in session. It does nothing on its
          own — you can close it.
        </p>
      </main>
    );
  }

  if (origins.length === 0 && framed) {
    return (
      <main className="p-4 text-sm text-gray-600 dark:text-gray-400">
        <p>No site may use this bridge on this host.</p>
      </main>
    );
  }

  return (
    <main className="p-4 text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
      <p>{ready ? "Session bridge ready." : "Restoring session…"}</p>
    </main>
  );
}
