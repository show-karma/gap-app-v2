/**
 * @file Tests for the Mixpanel singleton (utilities/analytics/client.ts) — the
 * only module allowed to touch `mixpanel-browser`.
 *
 * The contract under test is what the old `useMixpanel` / `mixpanelEvent`
 * helpers got wrong: analytics is enabled by token presence rather than by
 * environment, `init` runs exactly once against the same-origin proxy, AI
 * first-touch attribution rides along on every event (the assertions here are
 * carried over from `mixpanelEvent-ai-first-touch.test.ts`), identify is
 * idempotent and resets on a user switch, and PII only ever reaches the
 * profile — never an event property.
 */

import {
  __resetAiFirstTouchCacheForTests,
  AI_FIRST_TOUCH_STORAGE_KEY,
  type AiFirstTouch,
} from "@/utilities/aiReferrer";
import {
  __resetAnalyticsClientForTests,
  __setStrictAnalyticsForTests,
  COMMUNITY_GROUP_KEY,
  identifyUser,
  isAnalyticsEnabled,
  MIXPANEL_PROXY_PATH,
  registerSuperProperties,
  resetIdentity,
  setCommunityGroup,
  track,
  trackPageView,
  unregisterSuperProperty,
} from "@/utilities/analytics/client";

const mp = vi.hoisted(() => {
  /**
   * Mixpanel's own persisted store, which `identify`/`reset` write and
   * `get_property` reads. Modelled here because identity in `client.ts` is
   * derived from it rather than from a module variable.
   */
  const store: Record<string, unknown> = {};
  return {
    __store: store,
    init: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    track: vi.fn(),
    track_pageview: vi.fn(),
    identify: vi.fn((userId: string) => {
      store.$user_id = userId;
    }),
    reset: vi.fn(() => {
      delete store.$user_id;
    }),
    get_property: vi.fn((name: string) => store[name]),
    set_group: vi.fn(),
    remove_group: vi.fn(),
    people: { set: vi.fn(), set_once: vi.fn() },
  };
});

vi.mock("mixpanel-browser", () => ({ default: mp }));

const STORED_FIRST_TOUCH: AiFirstTouch = {
  source: "perplexity",
  medium: "referral",
  landingPath: "/project/my-project",
  firstSeenAt: "2026-07-31T10:00:00.000Z",
};

const AI_PROPS = {
  ai_source: "perplexity",
  ai_source_medium: "referral",
  ai_first_touch_at: "2026-07-31T10:00:00.000Z",
} as const;

const storeFirstTouch = (firstTouch: AiFirstTouch = STORED_FIRST_TOUCH) => {
  window.localStorage.setItem(AI_FIRST_TOUCH_STORAGE_KEY, JSON.stringify(firstTouch));
  __resetAiFirstTouchCacheForTests();
};

const trackedProps = (call = 0): Record<string, unknown> =>
  mp.track.mock.calls[call][1] as Record<string, unknown>;

const initConfig = (): Record<string, unknown> =>
  mp.init.mock.calls[0][1] as Record<string, unknown>;

describe("analytics client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    window.localStorage.clear();
    for (const key of Object.keys(mp.__store)) delete mp.__store[key];
    __resetAiFirstTouchCacheForTests();
    __resetAnalyticsClientForTests();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const enable = (env = "production") => {
    process.env.NEXT_PUBLIC_MIXPANEL_KEY = "test-token";
    process.env.NEXT_PUBLIC_ENV = env;
    process.env.NEXT_PUBLIC_APP_VERSION = "1.8.7";
  };

  describe("without a project token", () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_MIXPANEL_KEY;
    });

    it("reports analytics as disabled", () => {
      expect(isAnalyticsEnabled()).toBe(false);
    });

    it("makes every entry point a no-op instead of throwing", () => {
      expect(() => {
        track("logout", { reason: "user" });
        trackPageView({ route_pattern: "/", page_group: "home" });
        identifyUser("did:privy:1", { email: "a@b.test" });
        resetIdentity();
        registerSuperProperties({ tenant: "karma" });
        setCommunityGroup("gitcoin");
      }).not.toThrow();

      expect(mp.init).not.toHaveBeenCalled();
      expect(mp.track).not.toHaveBeenCalled();
      expect(mp.identify).not.toHaveBeenCalled();
    });
  });

  describe("initialization", () => {
    it("is enabled by token presence in any environment, not just production", () => {
      enable("staging");
      expect(isAnalyticsEnabled()).toBe(true);

      track("logout", { reason: "user" });
      expect(mp.init).toHaveBeenCalledTimes(1);
      expect(mp.track).toHaveBeenCalledTimes(1);
    });

    it("initializes exactly once across many calls", () => {
      enable();

      track("logout", { reason: "user" });
      track("logout", { reason: "cross_tab" });
      trackPageView({ route_pattern: "/", page_group: "home" });

      expect(mp.init).toHaveBeenCalledTimes(1);
      expect(mp.init).toHaveBeenCalledWith("test-token", expect.any(Object));
    });

    it("routes the SDK through the same-origin proxy", () => {
      enable();
      track("logout", { reason: "user" });

      expect(initConfig().api_host).toBe(`${window.location.origin}${MIXPANEL_PROXY_PATH}`);
    });

    it("persists to localStorage and disables the SDK's own pageview tracker", () => {
      enable();
      track("logout", { reason: "user" });

      expect(initConfig()).toMatchObject({
        persistence: "localStorage",
        track_pageview: false,
        ignore_dnt: false,
      });
    });

    it("turns debug logging on outside production and off in production", () => {
      enable("staging");
      track("logout", { reason: "user" });
      expect(initConfig().debug).toBe(true);

      __resetAnalyticsClientForTests();
      vi.clearAllMocks();
      enable("production");
      track("logout", { reason: "user" });
      expect(initConfig().debug).toBe(false);
    });

    it("registers the environment super properties at init", () => {
      enable();
      track("logout", { reason: "user" });

      expect(mp.register).toHaveBeenCalledWith({ env: "production", app_version: "1.8.7" });
    });

    it("retries init on the next call after a transient failure", () => {
      enable();
      mp.init.mockImplementationOnce(() => {
        throw new Error("storage disabled");
      });

      expect(() => track("logout", { reason: "user" })).not.toThrow();
      expect(mp.track).not.toHaveBeenCalled();

      track("logout", { reason: "cross_tab" });

      expect(mp.init).toHaveBeenCalledTimes(2);
      expect(mp.track).toHaveBeenCalledTimes(1);
      expect(mp.track).toHaveBeenCalledWith("logout", { reason: "cross_tab" });
    });

    it("does not re-initialise the SDK when only the follow-up register failed", () => {
      enable();
      mp.register.mockImplementationOnce(() => {
        throw new Error("storage briefly unavailable");
      });

      track("logout", { reason: "user" });
      track("logout", { reason: "cross_tab" });

      // init succeeded the first time; re-running it would be a much bigger
      // hammer than a failed register needs.
      expect(mp.init).toHaveBeenCalledTimes(1);
      expect(mp.track).toHaveBeenCalledTimes(2);
    });

    it("retries the context register on the next call", () => {
      enable();
      mp.register.mockImplementationOnce(() => {
        throw new Error("storage briefly unavailable");
      });

      track("logout", { reason: "user" });
      expect(mp.register).toHaveBeenCalledTimes(1);

      track("logout", { reason: "cross_tab" });

      expect(mp.register).toHaveBeenCalledTimes(2);
      expect(mp.register).toHaveBeenLastCalledWith({
        env: "production",
        app_version: "1.8.7",
      });
    });

    it("registers the tenant a failed init had already been told about", () => {
      enable();
      mp.init.mockImplementationOnce(() => {
        throw new Error("storage disabled");
      });
      // A tenant registered while analytics could not initialise is held in
      // module state; losing it on the retry would report the tenant as the
      // default one for the rest of the page.
      registerSuperProperties({ tenant: "filecoin", is_whitelabel: true });

      track("logout", { reason: "user" });

      expect(mp.register).toHaveBeenCalledWith({
        env: "production",
        app_version: "1.8.7",
        tenant: "filecoin",
        is_whitelabel: true,
      });
    });

    it("keeps session replay off — the DOM here holds grant and donor detail", () => {
      enable();
      track("logout", { reason: "user" });

      expect(initConfig().record_sessions_percent).toBe(0);
    });

    it("swallows a throwing SDK call rather than surfacing it to product code", () => {
      enable();
      mp.track.mockImplementationOnce(() => {
        throw new Error("network down");
      });

      expect(() => track("logout", { reason: "user" })).not.toThrow();
    });
  });

  describe("track", () => {
    it("merges the stored AI first touch into a later conversion event", () => {
      enable();
      storeFirstTouch();

      track("donation_completed", {
        community_id: "gitcoin",
        total_usd: 100,
        currency: "USDC",
        chain_id: 10,
        used_onramp: false,
      });

      expect(mp.track).toHaveBeenCalledWith("donation_completed", {
        ...AI_PROPS,
        community_id: "gitcoin",
        total_usd: 100,
        currency: "USDC",
        chain_id: 10,
        used_onramp: false,
      });
    });

    it("lets an explicit event property win over the first-touch value", () => {
      enable();
      storeFirstTouch();

      track("ai_referral_landing", {
        ai_source: "chatgpt",
        ai_source_medium: "utm",
        ai_landing_path: "/",
      });

      expect(trackedProps().ai_source).toBe("chatgpt");
      expect(trackedProps().ai_source_medium).toBe("utm");
    });

    it("leaves properties untouched when the visitor has no AI first touch", () => {
      enable();

      track("logout", { reason: "user" });

      expect(trackedProps()).toEqual({ reason: "user" });
    });

    it("ignores a corrupted stored first touch rather than polluting the event", () => {
      enable();
      window.localStorage.setItem(AI_FIRST_TOUCH_STORAGE_KEY, "{not-json");
      __resetAiFirstTouchCacheForTests();

      track("logout", { reason: "user" });

      expect(trackedProps()).toEqual({ reason: "user" });
    });
  });

  describe("trackPageView", () => {
    it("sends the route family and community through the SDK's pageview channel", () => {
      enable();
      storeFirstTouch();

      trackPageView({
        route_pattern: "/community/:id/grants",
        page_group: "community",
        community_id: "gitcoin",
      });

      expect(mp.track_pageview).toHaveBeenCalledWith({
        ...AI_PROPS,
        route_pattern: "/community/:id/grants",
        page_group: "community",
        community_id: "gitcoin",
      });
    });
  });

  describe("PII guard", () => {
    beforeEach(() => {
      enable();
    });

    it("drops a PII-shaped property instead of sending it", () => {
      track("project_edited", {
        project_id: "proj-1",
        fields_changed: ["title", "alice@example.test"],
      });

      expect(trackedProps()).toEqual({ project_id: "proj-1", fields_changed: ["title"] });
    });

    it("throws in strict mode so a regression fails the suite that covers it", () => {
      __setStrictAnalyticsForTests(true);

      expect(() =>
        track("project_edited", {
          project_id: "proj-1",
          fields_changed: ["0x1234567890abcdef1234567890abcdef12345678"],
        })
      ).toThrow(/fields_changed/);
      expect(mp.track).not.toHaveBeenCalled();
    });

    it("lets a clean event through in strict mode", () => {
      __setStrictAnalyticsForTests(true);

      expect(() =>
        track("project_edited", { project_id: "p", fields_changed: ["title"] })
      ).not.toThrow();
      expect(mp.track).toHaveBeenCalledTimes(1);
    });

    it("guards page views too", () => {
      trackPageView({ route_pattern: "/project/:id", page_group: "project", community_id: null });

      expect(mp.track_pageview).toHaveBeenCalledWith({
        route_pattern: "/project/:id",
        page_group: "project",
        community_id: null,
      });
    });
  });

  describe("identifyUser", () => {
    it("ignores an empty user id", () => {
      enable();
      identifyUser("");
      expect(mp.identify).not.toHaveBeenCalled();
    });

    it("identifies once for repeated calls with the same user", () => {
      enable();

      identifyUser("did:privy:alice");
      identifyUser("did:privy:alice");
      identifyUser("did:privy:alice");

      expect(mp.identify).toHaveBeenCalledTimes(1);
      expect(mp.identify).toHaveBeenCalledWith("did:privy:alice");
      expect(mp.reset).not.toHaveBeenCalled();
    });

    it("resets before identifying a different user so device history is not inherited", () => {
      enable();

      identifyUser("did:privy:alice");
      identifyUser("did:privy:bob");

      expect(mp.reset).toHaveBeenCalledTimes(1);
      expect(mp.identify).toHaveBeenNthCalledWith(2, "did:privy:bob");
    });

    it("re-identifies a user Mixpanel already remembers from a previous page load", () => {
      enable();
      // A reload: the module is new, Mixpanel's persisted store is not.
      mp.__store.$user_id = "did:privy:alice";

      identifyUser("did:privy:alice");

      expect(mp.identify).not.toHaveBeenCalled();
      expect(mp.reset).not.toHaveBeenCalled();
    });

    it("keeps the tenant context across a user switch", () => {
      enable();
      registerSuperProperties({ tenant: "filecoin", is_whitelabel: true });
      identifyUser("did:privy:alice");
      registerSuperProperties({ wallet_connected: true, auth_method: "wallet" });
      mp.register.mockClear();

      identifyUser("did:privy:bob");

      expect(mp.register).toHaveBeenCalledWith({
        env: "production",
        app_version: "1.8.7",
        tenant: "filecoin",
        is_whitelabel: true,
      });
    });

    it("does not carry the previous user's login method into the new session", () => {
      enable();
      identifyUser("did:privy:alice");
      registerSuperProperties({ wallet_connected: true, auth_method: "wallet" });
      mp.register.mockClear();

      identifyUser("did:privy:bob");

      const restored = mp.register.mock.calls[0][0] as Record<string, unknown>;
      expect(restored).not.toHaveProperty("auth_method");
      expect(restored).not.toHaveProperty("wallet_connected");
    });

    it("writes PII to the profile and never onto an event", () => {
      enable();

      identifyUser("did:privy:alice", {
        email: "alice@example.test",
        name: "Alice",
        primaryWallet: "0xabc",
        authMethods: ["email", "wallet"],
      });
      track("logout", { reason: "user" });

      expect(mp.people.set).toHaveBeenCalledWith({
        $email: "alice@example.test",
        $name: "Alice",
        primary_wallet: "0xabc",
        auth_methods: ["email", "wallet"],
      });
      expect(mp.people.set_once).toHaveBeenCalledWith({ first_seen_at: expect.any(String) });

      const registered = mp.register.mock.calls.flatMap((call) => Object.keys(call[0] as object));
      expect(registered).not.toContain("$email");
      expect(registered).not.toContain("primary_wallet");
      expect(trackedProps()).toEqual({ reason: "user" });
    });

    it("skips the profile write when there is nothing but the id", () => {
      enable();

      identifyUser("did:privy:alice");

      expect(mp.people.set).not.toHaveBeenCalled();
      expect(mp.people.set_once).not.toHaveBeenCalled();
    });
  });

  describe("resetIdentity", () => {
    it("does nothing when Mixpanel holds no identity", () => {
      enable();
      track("logout", { reason: "user" });
      mp.register.mockClear();

      resetIdentity();

      expect(mp.reset).not.toHaveBeenCalled();
      expect(mp.register).not.toHaveBeenCalled();
    });

    it("clears an identity persisted by a previous page load", () => {
      enable();
      // A reload straight into a signed-out state — the case a module-level
      // mirror of the identity would get wrong.
      mp.__store.$user_id = "did:privy:alice";

      resetIdentity();

      expect(mp.reset).toHaveBeenCalledTimes(1);
    });

    it("keeps the tenant context after logout", () => {
      enable();
      registerSuperProperties({ tenant: "filecoin", is_whitelabel: true });
      identifyUser("did:privy:alice");
      mp.register.mockClear();

      resetIdentity();

      expect(mp.register).toHaveBeenCalledWith(
        expect.objectContaining({ tenant: "filecoin", is_whitelabel: true })
      );
    });

    it("resets and re-applies the environment super properties", () => {
      enable();
      identifyUser("did:privy:alice");
      mp.register.mockClear();

      resetIdentity();

      expect(mp.reset).toHaveBeenCalledTimes(1);
      expect(mp.register).toHaveBeenCalledWith({ env: "production", app_version: "1.8.7" });
    });

    it("lets the next identify re-bind without a spurious reset", () => {
      enable();
      identifyUser("did:privy:alice");
      resetIdentity();
      mp.reset.mockClear();

      identifyUser("did:privy:alice");

      expect(mp.reset).not.toHaveBeenCalled();
      expect(mp.identify).toHaveBeenLastCalledWith("did:privy:alice");
    });
  });

  describe("super properties", () => {
    it("drops undefined values", () => {
      enable();

      registerSuperProperties({ tenant: "gitcoin", is_whitelabel: undefined });

      expect(mp.register).toHaveBeenLastCalledWith({ tenant: "gitcoin" });
    });

    it("does not call the SDK when every value is undefined", () => {
      enable();
      track("logout", { reason: "user" });
      mp.register.mockClear();

      registerSuperProperties({ tenant: undefined });

      expect(mp.register).not.toHaveBeenCalled();
    });

    it("unregisters a key on request", () => {
      enable();
      unregisterSuperProperty("tenant");
      expect(mp.unregister).toHaveBeenCalledWith("tenant");
    });

    it("registers exactly the snake_case tenant keys, with no camelCase twin", () => {
      enable();

      registerSuperProperties({ tenant: "filecoin", is_whitelabel: true });

      const registered = mp.register.mock.calls.at(-1)?.[0] as Record<string, unknown>;
      expect(Object.keys(registered).sort()).toEqual(["is_whitelabel", "tenant"]);
    });
  });

  describe("community group", () => {
    it("sets the group when on a community route", () => {
      enable();
      setCommunityGroup("gitcoin");
      expect(mp.set_group).toHaveBeenCalledWith(COMMUNITY_GROUP_KEY, "gitcoin");
    });

    it("drops both the binding and the super property when leaving community routes", () => {
      enable();

      setCommunityGroup(null);

      // Unregistering alone would leave the device joined to the last community
      // it visited, which is what group analytics aggregate on.
      expect(mp.set_group).toHaveBeenCalledWith(COMMUNITY_GROUP_KEY, []);
      expect(mp.unregister).toHaveBeenCalledWith(COMMUNITY_GROUP_KEY);
    });

    it("re-binds the community after a logout on a community route", () => {
      enable();
      setCommunityGroup("gitcoin");
      identifyUser("did:privy:alice");
      mp.set_group.mockClear();

      resetIdentity();

      // `reset` clears the group binding as well as the identity, and the
      // visitor is still standing on the community's page.
      expect(mp.set_group).toHaveBeenCalledWith(COMMUNITY_GROUP_KEY, "gitcoin");
    });

    it("re-binds the community across a user switch", () => {
      enable();
      setCommunityGroup("gitcoin");
      identifyUser("did:privy:alice");
      mp.set_group.mockClear();

      identifyUser("did:privy:bob");

      expect(mp.set_group).toHaveBeenCalledWith(COMMUNITY_GROUP_KEY, "gitcoin");
    });

    it("does not re-bind a community the visitor has already left", () => {
      enable();
      setCommunityGroup("gitcoin");
      setCommunityGroup(null);
      identifyUser("did:privy:alice");
      mp.set_group.mockClear();

      resetIdentity();

      expect(mp.set_group).not.toHaveBeenCalledWith(COMMUNITY_GROUP_KEY, "gitcoin");
    });
  });
});
