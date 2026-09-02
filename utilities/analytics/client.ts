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
 *   - Community context (group + slug) is read back from Mixpanel's store for
 *     the same reason as identity: it is persisted in `localStorage` and so
 *     outlives the module, while any mirror of it is re-created empty on every
 *     fresh document.
 *   - PII (email, wallet) is written to the *profile* via `identifyUser`,
 *     never onto events; `redactSensitiveProps` is the runtime backstop, and
 *     `property_blacklist` covers the URL properties the SDK adds by itself.
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

/** Super property holding the readable community slug, in that same store. */
const COMMUNITY_SLUG_PROPERTY = "community_slug";

/**
 * Mixpanel's own name for a web page view.
 *
 * Emitted through `track` rather than `track_pageview` so the event carries
 * exactly the properties this module puts on it. `track_pageview` merges
 * `mpPageViewProperties()` in first — `current_url_path` and
 * `current_url_search` among them — which is the whole of what
 * `route-pattern.ts` exists to prevent.
 */
const PAGE_VIEW_EVENT = "$mp_web_page_view";

/**
 * Ingestion routes, named without the SDK's default trailing slash.
 *
 * `DEFAULT_API_ROUTES` is `track/`, `engage/`, `groups/`. The app does not set
 * `trailingSlash`, so Next answers `/api/mp/track/` with a 308 to
 * `/api/mp/track` — every single event paid a redirect before its POST. Two
 * round trips per event, and a redirected POST is exactly the shape a flaky
 * connection turns into a dropped event.
 *
 * All five keys are listed because `api_routes` is shallow-merged into the
 * config: a partial object would leave the omitted ones `undefined` and put
 * that word in the URL. `record` and `flags` are unreachable anyway — session
 * replay is off, flags are unused, and the proxy's allowlist is `track`,
 * `engage`, `groups` — but a 404 on a real path reads better in a log.
 */
const MIXPANEL_API_ROUTES = {
  track: "track",
  engage: "engage",
  groups: "groups",
  record: "record",
  flags: "flags",
} as const;

/**
 * Properties the SDK attaches by itself that carry a raw URL.
 *
 * `route-pattern.ts` templates every path this app reports, so a share token in
 * `/s/sh_…` never reaches Mixpanel — but that only governs the properties this
 * module sets. The SDK adds its own to every event from `_.info.properties()`
 * (`$current_url`, `$referrer`) and from the persisted campaign params
 * (`$initial_referrer`), and those are the concrete URL, token and all.
 * `$initial_referrer` is the worst of them: it is written once and persists for
 * the life of the device.
 *
 * `property_blacklist` is applied to the fully merged property bag at track
 * time, so one list covers the per-event defaults, the persisted super
 * properties, and anything `track_pageview` would add.
 *
 * The domain-only companions (`$referring_domain`, `$initial_referring_domain`)
 * deliberately stay: a hostname cannot carry a token, and acquisition reporting
 * needs them.
 */
const URL_BEARING_PROPERTIES: readonly string[] = [
  "$current_url",
  "$referrer",
  "$initial_referrer",
  "current_url_path",
  "current_url_search",
];

interface UserProfile {
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
interface SuperProperties {
  tenant?: string;
  is_whitelabel?: boolean;
  env?: string;
  app_version?: string;
  wallet_connected?: boolean;
  auth_method?: string;
}

/**
 * `community_slug` is deliberately NOT a member of `SuperProperties`.
 *
 * It is written and cleared by {@link setCommunitySlug}, which dedupes against
 * Mixpanel's persisted store. Leaving it on the generic surface would give it a
 * second writer that dedupes against nothing, and `currentContext` would then
 * replay a stale slug after every reset.
 */

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

/**
 * Everything `contextToRestore` must NOT replay.
 *
 * The identity-scoped keys would attribute the previous user's login method to
 * the new one. The community keys are here for a different reason: they say
 * WHERE the visitor is, and only `AnalyticsProvider` knows that. Replaying them
 * from a module record would re-attach a community the reset had just cleared —
 * and that record is empty on a fresh document anyway, so it could only ever be
 * right by accident. The provider rebinds unconditionally on its next settled
 * run, which is the same run that performed the reset.
 */
const NON_RESTORED_KEYS: readonly string[] = [
  ...IDENTITY_SCOPED_KEYS,
  COMMUNITY_SLUG_PROPERTY,
  COMMUNITY_GROUP_KEY,
];

/**
 * `community_id` is deliberately absent.
 *
 * `set_group` already registers it as a super property, and it registers it as
 * a one-element ARRAY — that is the shape Mixpanel's group analytics join on.
 * Passing it here as well set a scalar, and an event property beats a super
 * property on merge, so `community_id` arrived as `"0x8dfb…"` on page views and
 * as `["0x8dfb…"]` on every other event. No report could filter across both.
 */
interface PageViewProps {
  /**
   * Templated route (`/project/:id/updates`), never the concrete pathname —
   * see `route-pattern.ts` for why.
   */
  route_pattern: string;
  /** First path segment (`project`, `community`, `funding-map`, …) — a cheap route family. */
  page_group: string;
}

let client: Mixpanel | null = null;
/**
 * The last super properties registered by the app, so a `reset()` — which
 * clears them — can put the deployment and tenant context back.
 */
let currentContext: SuperProperties = {};
/** Whether the deployment/tenant context survived its `register` call. */
let contextRegistered = false;
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
      // Unslashed, so the proxy answers the POST instead of 308-ing it first.
      api_routes: { ...MIXPANEL_API_ROUTES },
      persistence: "localStorage",
      // Manual page views (see `trackPageView`) so the route family and
      // community group are attached; the SDK's own tracker cannot know them.
      track_pageview: false,
      // The SDK's own URL properties never leave the browser. See
      // `URL_BEARING_PROPERTIES`: without this, every event carried the
      // concrete pathname and undid `route-pattern.ts`.
      property_blacklist: [...URL_BEARING_PROPERTIES],
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

  // Immediately after a successful init, before anything can be emitted.
  // Separate from the `init` try above: this failing is not a reason to retry
  // `init`, which has already succeeded and must not be run twice.
  try {
    clearPersistedCommunityContext(client);
  } catch {
    // SUPPRESSED: a stale community property is a reporting defect, not a
    // reason to take analytics down. The provider's first settled run
    // overwrites it on any community route, and `setCommunityGroup(null)`
    // clears it on any other.
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

/** A persisted super property, when it holds a non-empty string. */
const persistedString = (mixpanel: Mixpanel, key: string): string | null => {
  const value: unknown = mixpanel.get_property(key);
  return typeof value === "string" && value ? value : null;
};

/**
 * Drops whatever community the previous document left behind.
 *
 * Mixpanel restores its super properties from `localStorage` the instant `init`
 * runs, so a fresh document starts life holding the community the LAST one
 * ended on — and every event fired before `AnalyticsProvider` completes its
 * first settled run carries it. On a non-community route nothing ever cleared
 * it, so the last community visited rode along indefinitely.
 *
 * Both halves go: the readable slug, and the group binding plus the super
 * property `set_group` registers alongside it. Clearing only the property would
 * leave the device joined to that community on the profile, which is what group
 * analytics aggregate on.
 *
 * Nothing is lost by being aggressive here — the provider rebinds the route's
 * real community on its first settled run, and until that lands "no community"
 * is the only honest answer.
 */
const clearPersistedCommunityContext = (mixpanel: Mixpanel): void => {
  mixpanel.unregister(COMMUNITY_SLUG_PROPERTY);
  mixpanel.set_group(COMMUNITY_GROUP_KEY, []);
  mixpanel.unregister(COMMUNITY_GROUP_KEY);
};

/** The distinct id Mixpanel currently considers identified, if any. */
const identifiedUserId = (mixpanel: Mixpanel): string | null =>
  persistedString(mixpanel, USER_ID_PROPERTY);

/**
 * The community the device is currently grouped into, read back from Mixpanel's
 * own store rather than from a module variable.
 *
 * `set_group` registers the key as a ONE-ELEMENT ARRAY, so that is the shape to
 * unwrap; the scalar branch covers a value written by hand.
 */
const persistedCommunityId = (mixpanel: Mixpanel): string | null => {
  const value: unknown = mixpanel.get_property(COMMUNITY_GROUP_KEY);
  const first: unknown = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" && first ? first : null;
};

/** Super properties that survive a reset: the deployment and the tenant. */
const contextToRestore = (): SuperProperties => {
  const restored: Record<string, unknown> = { ...baseSuperProperties(), ...currentContext };
  for (const key of NON_RESTORED_KEYS) {
    delete restored[key];
  }
  return restored as SuperProperties;
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
  // The community is deliberately NOT restored here — see `NON_RESTORED_KEYS`.
  // `AnalyticsProvider` calls `setCommunitySlug` and `setCommunityGroup`
  // unconditionally straight after it settles identity, so a visitor still
  // standing on a community page is rebound in the same effect run that ended
  // their session. Restoring it here as well would only resurrect a community
  // they had already left.
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
  const prepared = prepareProps(PAGE_VIEW_EVENT, props as unknown as Record<string, unknown>);
  safely((mixpanel) => {
    mixpanel.track(PAGE_VIEW_EVENT, prepared);
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

/**
 * Drops a super property. Also reachable for the group key, which Mixpanel
 * registers on `set_group`.
 *
 * Removes it from `currentContext` as well as from the SDK: that record is what
 * `resetAndRestoreContext` replays after a `reset()`, so leaving the key behind
 * would resurrect the value on the next logout or user switch.
 */
export function unregisterSuperProperty(key: keyof SuperProperties | string): void {
  if (key in currentContext) {
    delete currentContext[key as keyof SuperProperties];
  }
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
 *
 * Whether a write is needed is decided by reading Mixpanel back, never by a
 * mirror held here or by a caller's ref. Both of those are re-created empty on
 * every fresh document while the super property is not — so after any community
 * visit, a hard load onto a non-community route saw "nothing bound", skipped
 * the clear, and left `community_id` riding on every later event.
 */
export function setCommunityGroup(communityId: string | null): void {
  safely((mixpanel) => {
    if (persistedCommunityId(mixpanel) === communityId) return;
    if (!communityId) {
      mixpanel.set_group(COMMUNITY_GROUP_KEY, []);
      mixpanel.unregister(COMMUNITY_GROUP_KEY);
      return;
    }
    mixpanel.set_group(COMMUNITY_GROUP_KEY, communityId);
  });
}

/**
 * Registers the community's readable slug, or clears it off a community route.
 *
 * Readable, not authoritative: `community_id` is the resolved uid and is what
 * grouping joins on, but a report filtered by hand is far easier to write
 * against `gitcoin` than against `0x8dfb…`. Taken from the community the layout
 * RESOLVED, never from the URL segment — that route accepts a uid too, so
 * reading it off the path would put uids into the one property whose whole
 * purpose is to be readable.
 *
 * Deduped against Mixpanel's persisted store, for the same reason
 * {@link setCommunityGroup} is: see the note on that function.
 */
export function setCommunitySlug(slug: string | null): void {
  safely((mixpanel) => {
    if (persistedString(mixpanel, COMMUNITY_SLUG_PROPERTY) === slug) return;
    if (!slug) {
      mixpanel.unregister(COMMUNITY_SLUG_PROPERTY);
      return;
    }
    mixpanel.register({ [COMMUNITY_SLUG_PROPERTY]: slug });
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
  strictForTests = false;
};
