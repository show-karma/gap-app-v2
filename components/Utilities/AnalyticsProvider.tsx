"use client";

import { usePathname } from "next/navigation";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { linkedAccountTypes, primaryAuthMethod } from "@/utilities/analytics/auth-method";
import { takePendingLogoutReason } from "@/utilities/analytics/auth-transitions";
import {
  identifyUser,
  registerSuperProperties,
  resetIdentity,
  setCommunityGroup,
  track,
  trackPageView,
  unregisterSuperProperty,
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

/**
 * What the provider remembers between runs of its effect.
 *
 * `lastIdentity` doubles as the DEPARTING identity when a session ends, which
 * is what the pending logout reason is matched against.
 */
interface SessionMemory {
  identityEpoch: RefObject<number>;
  lastIdentity: RefObject<string | null>;
  wasAuthenticated: RefObject<boolean | null>;
  lastPageViewKey: RefObject<string | null>;
  lastGroup: RefObject<string | null>;
  lastCommunitySlug: RefObject<string | null>;
}

interface ResolvedIdentity {
  authenticated: boolean;
  userId: string | undefined;
  email: string | null;
  address: string | undefined;
  authMethods: string[];
}

/**
 * Identity first: whoever Mixpanel restored from localStorage is replaced by
 * whoever Privy resolved, before anything else is written.
 *
 * The epoch is bumped on every identity change so the page-view dedupe cannot
 * suppress the first view of a NEW session that happens to be on the same route.
 */
const settleIdentity = (identity: ResolvedIdentity, memory: SessionMemory): void => {
  const { authenticated, userId, email, address, authMethods } = identity;
  const wasAuthenticated = memory.wasAuthenticated.current;
  memory.wasAuthenticated.current = authenticated;

  if (authenticated && userId) {
    if (memory.lastIdentity.current !== userId) {
      memory.lastIdentity.current = userId;
      memory.identityEpoch.current += 1;
    }
    identifyUser(userId, { email, primaryWallet: address ?? null, authMethods });
    registerSuperProperties({
      wallet_connected: Boolean(address),
      auth_method: primaryAuthMethod(authMethods),
    });
    return;
  }

  // The one place `logout` is reported. The reason was recorded by whichever
  // guard in `useAuth` ended the session, against the identity that is leaving;
  // a session the user ended themselves recorded nothing and defaults to "user".
  if (wasAuthenticated === true) {
    track("logout", { reason: takePendingLogoutReason(memory.lastIdentity.current) });
  }
  if (memory.lastIdentity.current !== null) {
    memory.lastIdentity.current = null;
    memory.identityEpoch.current += 1;
  }
  resetIdentity();
};

/**
 * The readable route label, alongside the authoritative uid. Written from the
 * URL because that is the only place it exists — the resolved community carries
 * a uid, and a report filtered by hand wants the word the visitor followed.
 */
const syncCommunitySlug = (routeCommunitySlug: string | null, memory: SessionMemory): void => {
  if (memory.lastCommunitySlug.current === routeCommunitySlug) return;
  memory.lastCommunitySlug.current = routeCommunitySlug;
  if (routeCommunitySlug !== null) {
    registerSuperProperties({ community_slug: routeCommunitySlug });
  } else {
    unregisterSuperProperty("community_slug");
  }
};

export function AnalyticsProvider() {
  const pathname = usePathname();
  const { isWhitelabel, communitySlug } = useWhitelabel();
  const { ready, authenticated, user, address } = useAuth();
  // Bound by the community layout from the resolved UID, not read off the URL —
  // `/community/[communityId]` accepts a slug or a uid, and grouping on the URL
  // segment splits one community into two groups. The layout only PUBLISHES it;
  // the write happens below, after identity has settled.
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

  const identityEpochRef = useRef(0);
  const lastIdentityRef = useRef<string | null>(null);
  const wasAuthenticatedRef = useRef<boolean | null>(null);
  const lastPageViewKeyRef = useRef<string | null>(null);
  /** What is currently written to the SDK, so an unchanged value is not rewritten. */
  const lastGroupRef = useRef<string | null>(null);
  const lastCommunitySlugRef = useRef<string | null>(null);

  // Refs are stable for the life of the component, so this bundle is built once.
  const memory = useMemo<SessionMemory>(
    () => ({
      identityEpoch: identityEpochRef,
      lastIdentity: lastIdentityRef,
      wasAuthenticated: wasAuthenticatedRef,
      lastPageViewKey: lastPageViewKeyRef,
      lastGroup: lastGroupRef,
      lastCommunitySlug: lastCommunitySlugRef,
    }),
    []
  );

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
   * *previous* session was. Gating on `ready` and resolving identity first makes
   * that ordering impossible rather than merely unlikely. The group binding is
   * written here too, for the same reason — the community layout that resolves
   * the uid has no view of whether Privy has caught up.
   */
  useEffect(() => {
    if (!ready || !pathname) return;

    // Privy says authenticated but has not produced the user yet. There is no
    // identity to attribute anything to, and Mixpanel may still be holding the
    // previous session's — so nothing at all is written until the uid lands.
    // `wasAuthenticated` is left untouched, so it only ever records a settled
    // state and a half-resolved session cannot fake a transition.
    if (authenticated && !userId) return;

    settleIdentity({ authenticated, userId, email, address, authMethods }, memory);

    const routeCommunitySlug = toCommunityId(pathname);
    syncCommunitySlug(routeCommunitySlug, memory);

    // On a community route, wait for the layout to bind the community before
    // reporting the view. A community page view that does not name its community
    // is not a useful row, and emitting one now and a corrected one a tick later
    // would double-count it.
    if (routeCommunitySlug !== null && boundCommunityId === null) return;

    // Identity is settled, so the group can be written. Only on change: the
    // effect re-runs on every navigation, and `set_group` is a network call.
    if (memory.lastGroup.current !== boundCommunityId) {
      memory.lastGroup.current = boundCommunityId;
      setCommunityGroup(boundCommunityId);
    }

    // Strict Mode mounts every effect twice in development, and a remount for
    // any other reason replays this one too. A view is the same view when the
    // concrete path and the identity behind it are unchanged — the CONCRETE
    // path, not the template, or navigating `/project/a` -> `/project/b` would
    // look like a replay and the second view would never be reported. Mixpanel
    // still only ever receives the template.
    const pageViewKey = `${pathname}|${memory.identityEpoch.current}|${boundCommunityId ?? ""}`;
    if (memory.lastPageViewKey.current === pageViewKey) return;
    memory.lastPageViewKey.current = pageViewKey;

    trackPageView({
      route_pattern: toRoutePattern(pathname),
      page_group: toPageGroup(pathname),
      community_id: boundCommunityId,
    });
  }, [
    ready,
    authenticated,
    userId,
    pathname,
    email,
    address,
    authMethods,
    boundCommunityId,
    memory,
  ]);

  return null;
}
