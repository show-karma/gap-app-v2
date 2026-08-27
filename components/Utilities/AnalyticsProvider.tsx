"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { linkedAccountTypes, primaryAuthMethod } from "@/utilities/analytics/auth-method";
import { takePendingLogoutReason } from "@/utilities/analytics/auth-transitions";
import {
  identifyUser,
  registerSuperProperties,
  resetIdentity,
  track,
  trackPageView,
} from "@/utilities/analytics/client";
import { useBoundCommunityId } from "@/utilities/analytics/community-group";
import { toCommunityId, toPageGroup, toRoutePattern } from "@/utilities/analytics/route-pattern";
import { useWhitelabel } from "@/utilities/whitelabel-context";

/**
 * Keeps the Mixpanel client in step with the app's ambient state. Renders null.
 *
 * Three things live here rather than in product code because they are
 * properties of the *session*, not of any one action: which tenant the visitor
 * is on, who they are, and where they are. Everything else — the events
 * themselves — is emitted from the hook that owns the flow.
 *
 * It is also the single emitter of `logout`. `useAuth` mounts at ~100 call
 * sites and every instance runs the same guards, so a session ending there
 * produced one event per instance; the guards now only record *why* (see
 * `auth-transitions.ts`) and exactly one provider reports it.
 *
 * Mounted once from `DeferredLayoutComponents` next to `AiReferrerTracker`, via
 * a dynamic `ssr:false` import so the Mixpanel SDK stays out of the initial
 * bundle and out of the server render. It MUST render inside
 * `WhitelabelProvider`: `useWhitelabel` falls back to a non-whitelabel default
 * rather than throwing, so a broken nesting would silently label every tenant's
 * traffic as the default one (see the layout regression test).
 */

const DEFAULT_TENANT = "karma";

export function AnalyticsProvider() {
  const pathname = usePathname();
  const { isWhitelabel, communitySlug } = useWhitelabel();
  const { ready, authenticated, user, address } = useAuth();
  // Bound by the community layout from the resolved UID, not read off the URL —
  // `/community/[communityId]` accepts a slug or a uid, and grouping on the URL
  // segment splits one community into two groups.
  const boundCommunityId = useBoundCommunityId();

  const userId = user?.id;
  const email = user?.email?.address ?? null;
  // Depend on the joined string, not the array: `linkedAccounts` is a fresh
  // array on every Privy render and would re-run the identify effect forever.
  const authMethodsKey = linkedAccountTypes(user?.linkedAccounts).join(",");
  const authMethods = useMemo(
    () => (authMethodsKey ? authMethodsKey.split(",") : []),
    [authMethodsKey]
  );

  /**
   * Which identity the events being emitted belong to. Bumped whenever the
   * identity changes so the page-view dedupe below cannot suppress the first
   * view of a *new* session that happens to be on the same route.
   */
  const identityEpochRef = useRef(0);
  const lastIdentityRef = useRef<string | null>(null);
  const wasAuthenticatedRef = useRef<boolean | null>(null);
  const lastPageViewKeyRef = useRef<string | null>(null);

  useEffect(() => {
    registerSuperProperties({
      tenant: communitySlug ?? DEFAULT_TENANT,
      is_whitelabel: isWhitelabel,
    });
  }, [communitySlug, isWhitelabel]);

  /**
   * Identity, then place — in that order, in one effect.
   *
   * Two effects would race on a reload: Mixpanel restores user A from
   * localStorage synchronously while Privy resolves asynchronously, so a page
   * view emitted before the identity is settled is attributed to whoever the
   * *previous* session was. Gating on `ready` and resolving identity first
   * makes that ordering impossible rather than merely unlikely.
   */
  useEffect(() => {
    if (!ready || !pathname) return;

    const wasAuthenticated = wasAuthenticatedRef.current;
    wasAuthenticatedRef.current = authenticated;

    if (authenticated && userId) {
      if (lastIdentityRef.current !== userId) {
        lastIdentityRef.current = userId;
        identityEpochRef.current += 1;
      }
      identifyUser(userId, { email, primaryWallet: address ?? null, authMethods });
      registerSuperProperties({
        wallet_connected: Boolean(address),
        auth_method: primaryAuthMethod(authMethods),
      });
    } else if (!authenticated) {
      // The one place `logout` is reported. The reason was recorded by whichever
      // guard in `useAuth` ended the session; a session the user ended
      // themselves recorded nothing and defaults to "user".
      if (wasAuthenticated === true) {
        track("logout", { reason: takePendingLogoutReason() });
      }
      if (lastIdentityRef.current !== null) {
        lastIdentityRef.current = null;
        identityEpochRef.current += 1;
      }
      resetIdentity();
    }

    // On a community route, wait for the layout to bind the community before
    // reporting the view. A community page view that does not name its
    // community is not a useful row, and emitting one now and a corrected one a
    // tick later would double-count it.
    if (toCommunityId(pathname) !== null && boundCommunityId === null) return;

    const routePattern = toRoutePattern(pathname);
    // Strict Mode mounts every effect twice in development, and a remount for
    // any other reason replays this one too. A view is the same view when both
    // the route and the identity behind it are unchanged.
    const pageViewKey = `${routePattern}|${identityEpochRef.current}|${boundCommunityId ?? ""}`;
    if (lastPageViewKeyRef.current === pageViewKey) return;
    lastPageViewKeyRef.current = pageViewKey;

    trackPageView({
      route_pattern: routePattern,
      page_group: toPageGroup(pathname),
      community_id: boundCommunityId,
    });
  }, [ready, authenticated, userId, pathname, email, address, authMethods, boundCommunityId]);

  return null;
}
