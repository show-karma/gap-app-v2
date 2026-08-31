"use client";

import { createContext, use, useContext } from "react";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import type { WhitelabelDomain } from "./whitelabel-config";

interface WhitelabelContextValue {
  isWhitelabel: boolean;
  communitySlug: string | null;
  config: WhitelabelDomain | null;
  tenantConfig: TenantConfig | null;
}

const WhitelabelCtx = createContext<WhitelabelContextValue>({
  isWhitelabel: false,
  communitySlug: null,
  config: null,
  tenantConfig: null,
});

/**
 * Takes the whitelabel context as a promise so the root layout never has to
 * await it: the layout stays synchronous and the request read happens here.
 *
 * This is the one component in the tree that unwraps it. `useWhitelabel` still
 * hands consumers a plain, resolved value, which is what keeps the change
 * small — around 25 call sites, `Link` among them, would otherwise start
 * suspending, and `Link` renders inside almost every page.
 *
 * That does mean this provider suspends until the host is known. It is
 * deliberately NOT wrapped in a Suspense boundary: without one, React holds
 * the shell until the promise settles and then emits one complete document.
 * With one, everything below — the page included — would stream as a hidden
 * late chunk that only JavaScript reveals, which is what DEV-612 forbids for
 * sitemap-crawlable routes. The chrome that CAN stream (navbar, footer, theme,
 * JSON-LD) takes the same promise directly and has its own boundaries.
 *
 * A resolved value is accepted too, so tests and stories can skip the promise.
 */
export function WhitelabelProvider({
  value,
  children,
}: {
  value: WhitelabelContextValue | Promise<WhitelabelContextValue>;
  children: React.ReactNode;
}) {
  // `use` is the one hook allowed to be called conditionally.
  const resolved = value instanceof Promise ? use(value) : value;

  return <WhitelabelCtx.Provider value={resolved}>{children}</WhitelabelCtx.Provider>;
}

export function useWhitelabel(): WhitelabelContextValue {
  return useContext(WhitelabelCtx);
}
