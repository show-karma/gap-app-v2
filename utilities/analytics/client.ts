/**
 * Mixpanel client — the only module that talks to `mixpanel-browser`.
 *
 * Design:
 *   - One lazily-created singleton. `mp.init` is synchronous, so the first
 *     caller (a mount effect, a Zustand action, a mutation callback) always
 *     gets a live client — there is no "instance set in an effect" race like
 *     the old `useMixpanel` hook had.
 *   - Enabled by token presence, not by environment. Staging/preview deploys
 *     get their own Mixpanel project token so the data can be verified there;
 *     `debug` logging turns on automatically outside production.
 *   - Requests go through the same-origin `/api/mp` proxy (see
 *     `app/api/mp/[...path]/route.ts`, which accepts POSTs to `track`,
 *     `engage` and `groups`) so tracker-blocking extensions do not silently
 *     drop a large share of events.
 *   - Every call is wrapped so analytics can never throw into product code.
 *   - Identity is read back from Mixpanel's own persisted state rather than
 *     mirrored in a module variable: the module is re-created on every reload
 *     while `localStorage` persistence is not, so a mirror is wrong exactly
 *     when it matters (a reload into a logged-out state).
 *   - PII (email, wallet) is written to the *profile* via `identifyUser`,
 *     never onto events; `redactSensitiveProps` is the runtime backstop.
 */

import mp, { type Mixpanel } from "mixpanel-browser";
import { getAiFirstTouchProps } from "@/utilities/aiReferrer";
import type { AnalyticsEventName, AnalyticsEventProps } from "./events";
import { redactSensitiveProps } from "./redact";

export const MIXPANEL_PROXY_PATH = "/api/mp";

/** Group key used for community-level analytics (`set_group`). */
export const COMMUNITY_GROUP_KEY = "community_id";

/** Mixpanel's own key for the identified distinct id, in its persisted store. */
const USER_ID_PROPERTY = "$user_id";

export interface UserProfile {
  email?: string | null;
  primaryWallet?: string | null;
  authMethods?: readonly string[];
  name?: string | null;
}

/**
 * The complete set of super properties this app registers. Closed on purpose —
 * an index signature would let a camelCase typo (`isWhitelabel`) register a
 * second, silently-empty property alongside the real one and split every report
 * that groups by it.
 */
export interface SuperProperties {
  tenant?: string;
  is_whitelabel?: boolean;
  env?: string;
  app_version?: string;
  wallet_connected?: boolean;
  auth_method?: string;
}

/**
 * Super properties that describe the *user* rather than the deployment or the
 * tenant. They are deliberately not restored after a reset: the next
 * `identifyUser` re-registers them, and carrying them across a user switch
 * would attribute the previous user's login method to the new one.
 */
const IDENTITY_SCOPED_KEYS = [
  "wallet_connected",
  "auth_method",
] as const satisfies readonly (keyof SuperProperties)[];

export interface PageViewProps {
  /**
   * Templated route (`/project/:id/updates`), never the concrete pathname —
   * see `route-pattern.ts` for why.
   */
  route_pattern: string;
  /** First path segment (`project`, `community`, `funding-map`, …) — a cheap route family. */
  page_group: string;
  community_id?: string | null;
}

let client: Mixpanel | null = null;
/**
 * The last super properties registered by the app, so a `reset()` — which
 * clears them — can put the deployment and tenant context back.
 */
let currentContext: SuperProperties = {};
/** Whether the deployment/tenant context survived its `register` call. */
let contextRegistered = false;
/**
 * The community the device is currently grouped into. Held here because
 * `reset()` drops the group binding along with everything else, and a signed-out
 * visitor still browsing a community must keep reporting as that community.
 */
let currentCommunityId: string | null = null;
let strictForTests = false;

const isBrowser = (): boolean => typeof window !== "undefined";

const isProduction = (): boolean => process.env.NEXT_PUBLIC_ENV === "production";

/** Analytics is on whenever a project token is configured — in any environment. */
export const isAnalyticsEnabled = (): boolean =>
  isBrowser() && Boolean(process.env.NEXT_PUBLIC_MIXPANEL_KEY);

const baseSuperProperties = (): SuperProperties => ({
  env: process.env.NEXT_PUBLIC_ENV || "development",
  app_version: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
});

/**
 * Registers the deployment and tenant context, once. Separate from `init` and
 * separately retried: `init` succeeding and `register` throwing are different
 * failures, and re-running `init` to recover a failed register would be a much
 * bigger hammer than the problem needs.
 *
 * Registers `currentContext` as well as the base, so a tenant registered
 * before a transient init failure is not lost on the retry.
 */
const ensureContextRegistered = (mixpanel: Mixpanel): void => {
  if (contextRegistered) return;
  try {
    mixpanel.register({ ...baseSuperProperties(), ...currentContext });
    contextRegistered = true;
  } catch {
    // SUPPRESSED: retried on the next call. Losing the tenant property is
    // worth one more attempt; it is not worth failing the event that
    // triggered this.
  }
};

const getClient = (): Mixpanel | null => {
  if (client) {
    ensureContextRegistered(client);
    return client;
  }
  if (!isAnalyticsEnabled()) return null;

  const token = process.env.NEXT_PUBLIC_MIXPANEL_KEY as string;
  try {
    mp.init(token, {
      api_host: `${window.location.origin}${MIXPANEL_PROXY_PATH}`,
      persistence: "localStorage",
      // Manual page views (see `trackPageView`) so the route family and
      // community group are attached; the SDK's own tracker cannot know them.
      track_pageview: false,
      debug: !isProduction(),
      ignore_dnt: false,
      // Session replay records the DOM, which on this app means grant
      // narratives, donor details and wallet addresses. Off explicitly rather
      // than by default so enabling it has to be a deliberate, reviewed change.
      record_sessions_percent: 0,
    });
    // Latched the moment `init` succeeds. A throw from `init` itself is usually
    // transient (storage briefly unavailable, an extension racing the SDK), so
    // that case retries; but once the SDK is initialised, re-initialising it
    // because a later call failed would be wrong.
    client = mp;
  } catch {
    // SUPPRESSED: a broken analytics bootstrap (storage disabled, SDK throwing
    // under a privacy extension) must degrade to "no analytics", never to a
    // crashed app. Nothing actionable to report from the client.
    return null;
  }

  ensureContextRegistered(client);
  return client;
};

const safely = (operation: (mixpanel: Mixpanel) => void): void => {
  const mixpanel = getClient();
  if (!mixpanel) return;
  try {
    operation(mixpanel);
  } catch {
    // SUPPRESSED: analytics is fire-and-forget telemetry. A failing call must
    // never surface to the user or to Sentry; Mixpanel retries its own queue.
  }
};

/** The distinct id Mixpanel currently considers identified, if any. */
const identifiedUserId = (mixpanel: Mixpanel): string | null => {
  const value: unknown = mixpanel.get_property(USER_ID_PROPERTY);
  return typeof value === "string" && value ? value : null;
};

/** Super properties that survive a reset: the deployment and the tenant. */
const contextToRestore = (): SuperProperties => {
  const restored: SuperProperties = { ...baseSuperProperties(), ...currentContext };
  for (const key of IDENTITY_SCOPED_KEYS) {
    delete restored[key];
  }
  return restored;
};

/**
 * Ends the current identity and puts back everything `reset()` clears. Used by
 * both logout and a user switch, so the two can never drift apart — the bug
 * being avoided is a signed-out (or newly signed-in) session losing its tenant
 * and reporting as the default one.
 */
const resetAndRestoreContext = (mixpanel: Mixpanel): void => {
  mixpanel.reset();
  mixpanel.register(contextToRestore());
  // `reset` clears the group binding too. Without this, logging out on a
  // community route silently detaches every subsequent event from that
  // community — and the visitor is still standing on its page.
  if (currentCommunityId) {
    mixpanel.set_group(COMMUNITY_GROUP_KEY, currentCommunityId);
  }
};

const definedEntries = (props: SuperProperties): SuperProperties => {
  const defined: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) defined[key] = value;
  }
  return defined as SuperProperties;
};

/**
 * Merges the AI first-touch attribution and strips anything PII-shaped. Runs
 * outside `safely` so strict mode can actually fail a test.
 */
const prepareProps = (
  name: string,
  properties: Record<string, unknown>
): Record<string, unknown> => {
  const { safe, dropped } = redactSensitiveProps({ ...getAiFirstTouchProps(), ...properties });
  if (dropped.length > 0 && strictForTests) {
    throw new Error(
      `Analytics "${name}" carries PII-shaped properties: ${dropped.join(", ")}. ` +
        "Put identifying values on the user profile via identifyUser instead."
    );
  }
  return safe;
};

/**
 * Tracks a catalog event. Names and property shapes are enforced by
 * `utilities/analytics/events.ts`; the AI first-touch attribution rides along
 * on every event, with event-level properties winning on key collision.
 */
export function track<TName extends AnalyticsEventName>(
  name: TName,
  properties: AnalyticsEventProps<TName>
): void {
  const prepared = prepareProps(name, properties as Record<string, unknown>);
  safely((mixpanel) => {
    mixpanel.track(name, prepared);
  });
}

/**
 * Records a page view with the templated route and (when on a community route)
 * the community group attached. Called from `AnalyticsProvider` on every
 * pathname change; product code never calls this directly.
 */
export function trackPageView(props: PageViewProps): void {
  const prepared = prepareProps("page_view", props as unknown as Record<string, unknown>);
  safely((mixpanel) => {
    mixpanel.track_pageview(prepared);
  });
}

/**
 * Binds the anonymous device to a real user and writes profile properties.
 * Idempotent per user id, so calling it from an effect that re-runs on auth
 * state changes is safe. Switching users (a different id already identified)
 * resets first so the new user does not inherit the previous device history.
 */
export function identifyUser(userId: string, profile: UserProfile = {}): void {
  if (!userId) return;
  safely((mixpanel) => {
    const current = identifiedUserId(mixpanel);
    if (current !== userId) {
      if (current) {
        resetAndRestoreContext(mixpanel);
      }
      mixpanel.identify(userId);
    }
    const people: Record<string, unknown> = {};
    if (profile.email) people.$email = profile.email;
    if (profile.name) people.$name = profile.name;
    if (profile.primaryWallet) people.primary_wallet = profile.primaryWallet;
    if (profile.authMethods?.length) people.auth_methods = [...profile.authMethods];
    if (Object.keys(people).length > 0) {
      mixpanel.people.set(people);
      mixpanel.people.set_once({ first_seen_at: new Date().toISOString() });
    }
  });
}

/**
 * Drops the identity after logout. Reads Mixpanel's persisted state rather than
 * a module flag so a reload straight into a signed-out state still clears the
 * previous user's distinct id.
 */
export function resetIdentity(): void {
  safely((mixpanel) => {
    if (!identifiedUserId(mixpanel)) return;
    resetAndRestoreContext(mixpanel);
  });
}

/** Super properties are attached to every subsequent event of this device. */
export function registerSuperProperties(props: SuperProperties): void {
  const defined = definedEntries(props);
  if (Object.keys(defined).length === 0) return;
  currentContext = { ...currentContext, ...defined };
  safely((mixpanel) => {
    mixpanel.register(defined);
  });
}

/** Also reachable for the group key, which Mixpanel registers on `set_group`. */
export function unregisterSuperProperty(key: keyof SuperProperties | string): void {
  safely((mixpanel) => {
    mixpanel.unregister(key);
  });
}

/**
 * Attaches the current community as a Mixpanel group. `set_group` also
 * registers `community_id` as a super property, so every event fired while
 * on a community route carries it.
 *
 * Leaving a community route clears both halves: the group binding on the
 * profile *and* the super property. Dropping only the super property would
 * leave the device permanently joined to the last community it visited, and
 * that binding is what community group analytics aggregate on.
 */
export function setCommunityGroup(communityId: string | null): void {
  currentCommunityId = communityId;
  if (!communityId) {
    safely((mixpanel) => {
      mixpanel.set_group(COMMUNITY_GROUP_KEY, []);
      mixpanel.unregister(COMMUNITY_GROUP_KEY);
    });
    return;
  }
  safely((mixpanel) => {
    mixpanel.set_group(COMMUNITY_GROUP_KEY, communityId);
  });
}

/**
 * Test-only: make the PII guard throw instead of silently dropping, so a
 * regression that starts sending an email fails the suite that covers it.
 */
export const __setStrictAnalyticsForTests = (enabled: boolean): void => {
  strictForTests = enabled;
};

/** Test-only: forget the singleton and registered context between test cases. */
export const __resetAnalyticsClientForTests = (): void => {
  client = null;
  contextRegistered = false;
  currentContext = {};
  currentCommunityId = null;
  strictForTests = false;
};
