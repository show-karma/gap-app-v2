/**
 * @file Community context in the Mixpanel client — the group binding, the
 * readable slug, and how both survive a reset.
 *
 * Split out of `client.test.ts`, which was over its size budget. The mock store
 * below is the same one that file uses, and it has to be: these cases are all
 * about state Mixpanel PERSISTS, so a mock that does not model persistence
 * cannot see the bug they cover (Addendum G1).
 */

import {
  __resetAiFirstTouchCacheForTests,
  AI_FIRST_TOUCH_STORAGE_KEY,
  type AiFirstTouch,
} from "@/utilities/aiReferrer";
import {
  __resetAnalyticsClientForTests,
  COMMUNITY_GROUP_KEY,
  identifyUser,
  resetIdentity,
  setCommunityGroup,
  setCommunitySlug,
  track,
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
    register: vi.fn((props: Record<string, unknown>) => {
      Object.assign(store, props);
    }),
    unregister: vi.fn((name: string) => {
      delete store[name];
    }),
    track: vi.fn(),
    track_pageview: vi.fn(),
    identify: vi.fn((userId: string) => {
      store.$user_id = userId;
    }),
    // The real `reset` empties the whole persisted store, not just the
    // identity — which is exactly why the community context has to be read
    // back before it runs.
    reset: vi.fn(() => {
      for (const key of Object.keys(store)) delete store[key];
    }),
    get_property: vi.fn((name: string) => store[name]),
    // `set_group` registers the key as a super property, and wraps a scalar
    // into a one-element array on the way. Modelled because that array is the
    // shape `community_id` has on every event.
    set_group: vi.fn((name: string, ids: unknown) => {
      store[name] = Array.isArray(ids) ? ids : [ids];
    }),
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

describe("analytics client — community context", () => {
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
  describe("community group", () => {
    it("sets the group when on a community route", () => {
      enable();
      setCommunityGroup("gitcoin");
      expect(mp.set_group).toHaveBeenCalledWith(COMMUNITY_GROUP_KEY, "gitcoin");
    });

    it("drops both the binding and the super property when leaving community routes", () => {
      enable();
      setCommunityGroup("gitcoin");

      setCommunityGroup(null);

      // Unregistering alone would leave the device joined to the last community
      // it visited, which is what group analytics aggregate on.
      expect(mp.set_group).toHaveBeenCalledWith(COMMUNITY_GROUP_KEY, []);
      expect(mp.unregister).toHaveBeenCalledWith(COMMUNITY_GROUP_KEY);
    });

    it("does not clear a community that was never bound", () => {
      enable();

      setCommunityGroup(null);

      expect(mp.set_group).not.toHaveBeenCalled();
      expect(mp.unregister).not.toHaveBeenCalled();
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

    it("re-binds the readable slug after a logout on a community route", () => {
      enable();
      setCommunitySlug("gitcoin");
      identifyUser("did:privy:alice");
      mp.register.mockClear();

      resetIdentity();

      expect(mp.register).toHaveBeenCalledWith({ community_slug: "gitcoin" });
    });

    it("writes nothing when the community is already the one bound", () => {
      enable();
      setCommunityGroup("gitcoin");
      setCommunitySlug("gitcoin");
      mp.set_group.mockClear();
      mp.register.mockClear();

      setCommunityGroup("gitcoin");
      setCommunitySlug("gitcoin");

      // `set_group` is a network call; the effect that drives this re-runs on
      // every navigation.
      expect(mp.set_group).not.toHaveBeenCalled();
      expect(mp.register).not.toHaveBeenCalled();
    });
  });

  /**
   * The regression Addendum G1 found on the deployed preview.
   *
   * `community_id` and `community_slug` are super properties, so Mixpanel keeps
   * them in `localStorage` — they outlive the module and every React ref that
   * used to mirror them. A fresh document on a non-community route starts with
   * an empty mirror, which reads as "nothing bound" and skips the clear, so the
   * community the visitor left rode along on every later event.
   */
  describe("community context across a fresh document", () => {
    /** A reload: the module is new, Mixpanel's persisted store is not. */
    const reloadOnto = (communityId: string | null, slug: string | null) => {
      __resetAnalyticsClientForTests();
      enable();
      setCommunityGroup(communityId);
      setCommunitySlug(slug);
    };

    it("clears a persisted community when the new document is not on one", () => {
      enable();
      setCommunityGroup("0xgitcoin");
      setCommunitySlug("gitcoin");

      reloadOnto(null, null);

      expect(mp.__store).not.toHaveProperty(COMMUNITY_GROUP_KEY);
      expect(mp.__store).not.toHaveProperty("community_slug");
    });

    it("keeps no community on any event fired after that load", () => {
      enable();
      setCommunityGroup("0xgitcoin");
      setCommunitySlug("gitcoin");

      reloadOnto(null, null);
      track("logout", { reason: "user" });

      // The mock's store IS the super-property bag the SDK merges onto every
      // event, so an entry left here is an entry on the wire.
      expect(mp.__store).not.toHaveProperty(COMMUNITY_GROUP_KEY);
      expect(mp.__store).not.toHaveProperty("community_slug");
    });

    it("replaces the persisted community when the new document is on another", () => {
      enable();
      setCommunityGroup("0xgitcoin");
      setCommunitySlug("gitcoin");

      reloadOnto("0xoptimism", "optimism");

      expect(mp.__store[COMMUNITY_GROUP_KEY]).toEqual(["0xoptimism"]);
      expect(mp.__store.community_slug).toBe("optimism");
    });
  });
});
