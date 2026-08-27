"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { linkedAccountTypes, primaryAuthMethod } from "@/utilities/analytics/auth-method";
import {
  identifyUser,
  registerSuperProperties,
  resetIdentity,
  setCommunityGroup,
  trackPageView,
} from "@/utilities/analytics/client";
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

  const userId = user?.id;
  const email = user?.email?.address ?? null;
  // Depend on the joined string, not the array: `linkedAccounts` is a fresh
  // array on every Privy render and would re-run the identify effect forever.
  const authMethodsKey = linkedAccountTypes(user?.linkedAccounts).join(",");
  const authMethods = useMemo(
    () => (authMethodsKey ? authMethodsKey.split(",") : []),
    [authMethodsKey]
  );

  useEffect(() => {
    registerSuperProperties({
      tenant: communitySlug ?? DEFAULT_TENANT,
      is_whitelabel: isWhitelabel,
    });
  }, [communitySlug, isWhitelabel]);

  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      resetIdentity();
      return;
    }

    if (!userId) return;

    identifyUser(userId, { email, primaryWallet: address ?? null, authMethods });
    registerSuperProperties({
      wallet_connected: Boolean(address),
      auth_method: primaryAuthMethod(authMethods),
    });
  }, [ready, authenticated, userId, email, address, authMethods]);

  useEffect(() => {
    if (!pathname) return;
    const communityId = toCommunityId(pathname);
    // Group first: `set_group` also registers `community_id` as a super
    // property, so the page view below carries it.
    setCommunityGroup(communityId);
    trackPageView({
      route_pattern: toRoutePattern(pathname),
      page_group: toPageGroup(pathname),
      community_id: communityId,
    });
  }, [pathname]);

  return null;
}
