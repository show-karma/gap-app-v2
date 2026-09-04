/**
 * @file Tests for AnalyticsProvider — the component that keeps Mixpanel's
 * session state (tenant, identity, page) in step with the app.
 *
 * `useAuth`, `useWhitelabel` and `usePathname` are mocked so each transition
 * can be driven directly; the assertions are on the analytics client module,
 * which is the seam product code is allowed to depend on.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { AnalyticsProvider } from "@/components/Utilities/AnalyticsProvider";
import {
  __resetPendingLogoutReasonForTests,
  beginLogout,
} from "@/utilities/analytics/auth-transitions";
import {
  identifyUser,
  registerSuperProperties,
  resetIdentity,
  setCommunityGroup,
  track,
  trackPageView,
} from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({
  identifyUser: vi.fn(),
  registerSuperProperties: vi.fn(),
  resetIdentity: vi.fn(),
  setCommunityGroup: vi.fn(),
  setCommunitySlug: vi.fn(),
  track: vi.fn(),
  trackPageView: vi.fn(),
}));

/**
 * The community group is bound by the community layout from the RESOLVED
 * community, not read off the URL — `/community/[communityId]` accepts a slug
 * or a uid, so the URL segment would split one community into two Mixpanel
 * groups and would put uids into the readable slug property.
 */
interface BoundCommunity {
  uid: string;
  slug: string | null;
}
const boundCommunityMock = vi.fn<() => BoundCommunity | null>(() => null);
vi.mock("@/utilities/analytics/community-group", () => ({
  useBoundCommunity: () => boundCommunityMock(),
}));

/** The layout binding a resolved community, uid and canonical slug together. */
const bindCommunity = (uid: string | null, slug: string | null = "gitcoin") =>
  boundCommunityMock.mockReturnValue(uid ? { uid, slug } : null);

const usePathnameMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

const useAuthMock = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

const useWhitelabelMock = vi.fn();
vi.mock("@/utilities/whitelabel-context", () => ({
  useWhitelabel: () => useWhitelabelMock(),
}));

interface AuthState {
  ready?: boolean;
  authenticated?: boolean;
  user?: {
    id: string;
    email?: { address: string };
    linkedAccounts?: Array<{ type: string }>;
  } | null;
  address?: string;
}

const setAuth = (state: AuthState = {}) => {
  useAuthMock.mockReturnValue({
    ready: state.ready ?? true,
    authenticated: state.authenticated ?? false,
    user: state.user ?? null,
    address: state.address,
  });
};

const setWhitelabel = (isWhitelabel = false, communitySlug: string | null = null) => {
  useWhitelabelMock.mockReturnValue({ isWhitelabel, communitySlug });
};

describe("AnalyticsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetPendingLogoutReasonForTests();
    usePathnameMock.mockReturnValue("/");
    bindCommunity(null);
    setAuth();
    setWhitelabel();
  });

  it("renders nothing", () => {
    const { container } = render(<AnalyticsProvider />);
    expect(container).toBeEmptyDOMElement();
  });

  describe("tenant super properties", () => {
    it("reports the default tenant off a whitelabel domain", () => {
      render(<AnalyticsProvider />);

      expect(registerSuperProperties).toHaveBeenCalledWith({
        tenant: "karma",
        is_whitelabel: false,
      });
    });

    it("reports the community slug as the tenant on a whitelabel domain", () => {
      setWhitelabel(true, "filecoin");
      render(<AnalyticsProvider />);

      expect(registerSuperProperties).toHaveBeenCalledWith({
        tenant: "filecoin",
        is_whitelabel: true,
      });
    });
  });

  describe("identity", () => {
    it("waits for Privy to be ready before touching identity", () => {
      setAuth({ ready: false });
      render(<AnalyticsProvider />);

      expect(identifyUser).not.toHaveBeenCalled();
      expect(resetIdentity).not.toHaveBeenCalled();
    });

    it("resets the identity for a ready, signed-out visitor", () => {
      setAuth({ ready: true, authenticated: false });
      render(<AnalyticsProvider />);

      expect(resetIdentity).toHaveBeenCalledTimes(1);
      expect(identifyUser).not.toHaveBeenCalled();
    });

    it("identifies the user with profile properties, never event properties", () => {
      setAuth({
        authenticated: true,
        address: "0xabc",
        user: {
          id: "did:privy:alice",
          email: { address: "alice@example.test" },
          linkedAccounts: [{ type: "email" }, { type: "wallet" }],
        },
      });
      render(<AnalyticsProvider />);

      expect(identifyUser).toHaveBeenCalledWith("did:privy:alice", {
        email: "alice@example.test",
        primaryWallet: "0xabc",
        authMethods: ["email", "wallet"],
      });
    });

    it("registers the wallet and auth-method super properties", () => {
      setAuth({
        authenticated: true,
        address: "0xabc",
        user: { id: "did:privy:alice", linkedAccounts: [{ type: "google_oauth" }] },
      });
      render(<AnalyticsProvider />);

      expect(registerSuperProperties).toHaveBeenCalledWith({
        wallet_connected: true,
        auth_method: "google",
      });
    });

    it("reports a wallet-only user as wallet_connected with the wallet method", () => {
      setAuth({
        authenticated: true,
        address: "0xabc",
        user: { id: "did:privy:bob", linkedAccounts: [{ type: "wallet" }] },
      });
      render(<AnalyticsProvider />);

      expect(registerSuperProperties).toHaveBeenCalledWith({
        wallet_connected: true,
        auth_method: "wallet",
      });
    });

    it("reports an authenticated user with no hydrated wallet as not connected", () => {
      setAuth({
        authenticated: true,
        user: { id: "did:privy:carol", linkedAccounts: [{ type: "farcaster" }] },
      });
      render(<AnalyticsProvider />);

      expect(registerSuperProperties).toHaveBeenCalledWith({
        wallet_connected: false,
        auth_method: "farcaster",
      });
    });

    it("does not re-identify when Privy re-renders with an equivalent user", () => {
      setAuth({
        authenticated: true,
        address: "0xabc",
        user: { id: "did:privy:alice", linkedAccounts: [{ type: "email" }] },
      });
      const { rerender } = render(<AnalyticsProvider />);

      // A fresh `linkedAccounts` array each render is exactly what Privy does.
      setAuth({
        authenticated: true,
        address: "0xabc",
        user: { id: "did:privy:alice", linkedAccounts: [{ type: "email" }] },
      });
      rerender(<AnalyticsProvider />);

      expect(identifyUser).toHaveBeenCalledTimes(1);
    });

    it("re-identifies when the user switches", () => {
      setAuth({ authenticated: true, user: { id: "did:privy:alice" } });
      const { rerender } = render(<AnalyticsProvider />);

      setAuth({ authenticated: true, user: { id: "did:privy:bob" } });
      rerender(<AnalyticsProvider />);

      expect(identifyUser).toHaveBeenCalledTimes(2);
      expect(identifyUser).toHaveBeenLastCalledWith("did:privy:bob", expect.any(Object));
    });
  });

  describe("page views", () => {
    it("sends the route family for a top-level page", () => {
      usePathnameMock.mockReturnValue("/funding-map");
      render(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledWith({
        route_pattern: "/funding-map",
        page_group: "funding-map",
      });
    });

    it("reports the root path as the home group", () => {
      usePathnameMock.mockReturnValue("/");
      render(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledWith({
        route_pattern: "/",
        page_group: "home",
      });
    });

    it("sends a templated route, never the identifier in the path", () => {
      usePathnameMock.mockReturnValue(
        "/project/0x1234567890abcdef1234567890abcdef12345678/updates"
      );
      render(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledWith({
        route_pattern: "/project/:projectId/updates",
        page_group: "project",
      });
    });

    it("reports the community by the uid the layout bound, not the URL segment", () => {
      usePathnameMock.mockReturnValue("/community/gitcoin/grants");
      bindCommunity("0xcommunityuid");

      render(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledWith({
        route_pattern: "/community/:communityId/grants",
        page_group: "community",
      });
      // `community_id` rides on the group super property instead — as the
      // array shape group analytics join on.
      expect(setCommunityGroup).toHaveBeenCalledWith("0xcommunityuid");
    });

    it("waits for the layout to resolve the community before reporting the view", () => {
      // Emitting now and a corrected one a tick later would double-count the
      // view; a community page view without its community is not a useful row.
      usePathnameMock.mockReturnValue("/community/gitcoin");
      bindCommunity(null);

      const { rerender } = render(<AnalyticsProvider />);
      expect(trackPageView).not.toHaveBeenCalled();

      bindCommunity("0xcommunityuid");
      rerender(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledTimes(1);
      expect(setCommunityGroup).toHaveBeenLastCalledWith("0xcommunityuid");
    });

    it("does not wait for a community on a route that has none", () => {
      usePathnameMock.mockReturnValue("/project/my-project");
      bindCommunity(null);

      render(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledWith({
        route_pattern: "/project/:projectId",
        page_group: "project",
      });
    });

    it("waits for Privy before reporting where the visitor is", () => {
      // A view emitted before identity resolves is attributed to whoever the
      // PREVIOUS session was — Mixpanel restores that from localStorage
      // synchronously while Privy resolves asynchronously.
      setAuth({ ready: false });
      usePathnameMock.mockReturnValue("/funding-map");

      render(<AnalyticsProvider />);

      expect(trackPageView).not.toHaveBeenCalled();
    });

    it("settles identity before reporting the page", () => {
      setAuth({ authenticated: true, user: { id: "did:privy:alice" } });
      usePathnameMock.mockReturnValue("/funding-map");

      render(<AnalyticsProvider />);

      const identifyOrder = vi.mocked(identifyUser).mock.invocationCallOrder[0];
      const viewOrder = vi.mocked(trackPageView).mock.invocationCallOrder[0];
      expect(identifyOrder).toBeLessThan(viewOrder);
    });

    it("reports one view across Strict Mode's development effect replay", () => {
      // The real thing, not a rerender: React 18+ Strict Mode mounts, unmounts
      // and remounts every effect in development. A rerender with unchanged
      // dependencies does not re-run an effect at all, so asserting on one
      // would pass even with the dedupe branch deleted.
      usePathnameMock.mockReturnValue("/funding-map");

      render(
        <StrictMode>
          <AnalyticsProvider />
        </StrictMode>
      );

      expect(trackPageView).toHaveBeenCalledTimes(1);
    });

    it("reports one view when the effect re-runs on the same route and identity", () => {
      // The wallet hydrating is a dependency change, so the effect genuinely
      // re-runs — but the visitor has not gone anywhere and is still the same
      // person, so it is still one view.
      usePathnameMock.mockReturnValue("/funding-map");
      setAuth({ authenticated: true, user: { id: "did:privy:alice" } });
      const { rerender } = render(<AnalyticsProvider />);

      setAuth({ authenticated: true, address: "0xabc", user: { id: "did:privy:alice" } });
      rerender(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledTimes(1);
    });

    it("reports both views when two paths share one template", () => {
      // The dedupe key is the CONCRETE path. `/project/a` and `/project/b` both
      // reduce to `/project/:projectId`, so a key built from the template would
      // silently swallow every navigation between two projects.
      usePathnameMock.mockReturnValue("/project/project-a");
      const { rerender } = render(<AnalyticsProvider />);

      usePathnameMock.mockReturnValue("/project/project-b");
      rerender(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledTimes(2);
      expect(trackPageView).toHaveBeenNthCalledWith(1, {
        route_pattern: "/project/:projectId",
        page_group: "project",
      });
      expect(trackPageView).toHaveBeenNthCalledWith(2, {
        route_pattern: "/project/:projectId",
        page_group: "project",
      });
    });

    it("reports the same route again once the identity behind it changes", () => {
      // Signing in without navigating is a new session on the same screen, and
      // the dedupe must not swallow its first view.
      usePathnameMock.mockReturnValue("/funding-map");
      const { rerender } = render(<AnalyticsProvider />);

      setAuth({ authenticated: true, user: { id: "did:privy:alice" } });
      rerender(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledTimes(2);
    });

    it("tracks a view on each client navigation", () => {
      usePathnameMock.mockReturnValue("/projects");
      const { rerender } = render(<AnalyticsProvider />);

      usePathnameMock.mockReturnValue("/funding-map");
      rerender(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledTimes(2);
      expect(trackPageView).toHaveBeenLastCalledWith({
        route_pattern: "/funding-map",
        page_group: "funding-map",
      });
    });
  });
});

/**
 * The provider owns every SDK write that depends on who the visitor is, and
 * performs them in one order: identity first, then the community group, then
 * the page.
 *
 * The bug this closes is quiet and only happens on a reload. Mixpanel restores
 * the previous session's distinct id from localStorage synchronously; Privy
 * resolves over the network. Anything written in between lands on the wrong
 * person — and the community layout, which resolves the uid, has no way to know
 * that.
 */
describe("AnalyticsProvider — the authenticated-but-unresolved gap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetPendingLogoutReasonForTests();
    usePathnameMock.mockReturnValue("/funding-map");
    bindCommunity(null);
    setWhitelabel();
  });

  it("writes nothing while authenticated with no user id", () => {
    setAuth({ ready: true, authenticated: true, user: null });

    render(<AnalyticsProvider />);

    expect(identifyUser).not.toHaveBeenCalled();
    expect(resetIdentity).not.toHaveBeenCalled();
    expect(setCommunityGroup).not.toHaveBeenCalled();
    expect(trackPageView).not.toHaveBeenCalled();
  });

  it("reports the page once the uid arrives", () => {
    setAuth({ ready: true, authenticated: true, user: null });
    const { rerender } = render(<AnalyticsProvider />);

    setAuth({ ready: true, authenticated: true, user: { id: "did:privy:alice" } });
    rerender(<AnalyticsProvider />);

    expect(identifyUser).toHaveBeenCalledWith("did:privy:alice", expect.any(Object));
    expect(trackPageView).toHaveBeenCalledTimes(1);
  });

  it("does not treat the gap as a session that ended", () => {
    // Signed in, then a render where Privy has dropped the user but still says
    // authenticated. Nothing has ended; reporting a logout here would invent one.
    setAuth({ ready: true, authenticated: true, user: { id: "did:privy:alice" } });
    const { rerender } = render(<AnalyticsProvider />);

    setAuth({ ready: true, authenticated: true, user: null });
    rerender(<AnalyticsProvider />);

    expect(track).not.toHaveBeenCalledWith("logout", expect.anything());
  });
});

/**
 * `community_id` is the resolved UID and is what grouping joins on;
 * `community_slug` is the readable route label beside it. Both exist because
 * neither answers the other's question.
 */
describe("AnalyticsProvider mounting (layout nesting)", () => {
  /**
   * The root layout, at the tenant mount: middleware rewrites every public URL
   * into `app/t/[tenant]`, so that is where the root layout lives and there is
   * no `app/layout.tsx`.
   */
  const ROOT_LAYOUT = "app/t/[tenant]/layout.tsx";

  const readSource = (relativePath: string) => {
    const absolute = join(process.cwd(), relativePath);
    if (!existsSync(absolute)) {
      // Named rather than left as an ENOENT from readFileSync: when a layout
      // moves, "this file is gone" is the finding, and a raw ENOENT deep in a
      // helper reads as a broken test rather than as a moved subject.
      throw new Error(`${relativePath} does not exist — has it moved?`);
    }
    return readFileSync(absolute, "utf-8");
  };

  it("is rendered by DeferredLayoutComponents", () => {
    const source = readSource("components/DeferredLayoutComponents.tsx");

    expect(source).toContain("components/Utilities/AnalyticsProvider");
    expect(source).toContain("<AnalyticsProvider />");
  });

  it("mounts DeferredLayoutComponents inside WhitelabelProvider in the root layout", () => {
    const source = readSource(ROOT_LAYOUT);

    const open = source.indexOf("<WhitelabelProvider");
    const close = source.indexOf("</WhitelabelProvider>");
    const mount = source.indexOf("<DeferredLayoutComponents");

    expect(open).toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);
    expect(mount).toBeGreaterThan(open);
    expect(mount).toBeLessThan(close);
  });
});

/**
 * `logout` is emitted here and nowhere else. `useAuth` mounts at ~100 call
 * sites and every instance runs the same session-ending guards, so emitting
 * there produced one event per mounted instance. The guards record the reason;
 * this component — of which exactly one is mounted — reports it once.
 */
describe("AnalyticsProvider — logout", () => {
  const signedIn = () => setAuth({ authenticated: true, user: { id: "did:privy:alice" } });

  const loggedOut = () => setAuth({ authenticated: false, user: null });

  beforeEach(() => {
    vi.clearAllMocks();
    __resetPendingLogoutReasonForTests();
    usePathnameMock.mockReturnValue("/funding-map");
    setWhitelabel();
  });

  it("reports the transition out of an authenticated session", () => {
    signedIn();
    const { rerender } = render(<AnalyticsProvider />);

    beginLogout("cross_tab", "did:privy:alice");
    loggedOut();
    rerender(<AnalyticsProvider />);

    expect(track).toHaveBeenCalledWith("logout", { reason: "cross_tab" });
  });

  it("defaults to the user having signed out themselves", () => {
    signedIn();
    const { rerender } = render(<AnalyticsProvider />);

    loggedOut();
    rerender(<AnalyticsProvider />);

    expect(track).toHaveBeenCalledWith("logout", { reason: "user" });
  });

  it("reports a continuous user switch against the DEPARTING user", () => {
    // Privy can swap `user` without ever passing through an unauthenticated
    // state. A's session ended at that moment and nowhere else, so it has to be
    // reported before B is identified — afterwards the departing identity is
    // gone and the exit would be filed under whoever arrived.
    signedIn();
    const { rerender } = render(<AnalyticsProvider />);
    beginLogout("user_switch", "did:privy:alice");

    setAuth({ authenticated: true, user: { id: "did:privy:bob" } });
    rerender(<AnalyticsProvider />);

    expect(track).toHaveBeenCalledWith("logout", { reason: "user_switch" });
    expect(identifyUser).toHaveBeenLastCalledWith("did:privy:bob", expect.any(Object));
  });

  it("reports the departure before identifying the arriving user", () => {
    signedIn();
    const { rerender } = render(<AnalyticsProvider />);
    vi.mocked(identifyUser).mockClear();
    vi.mocked(track).mockClear();
    beginLogout("user_switch", "did:privy:alice");

    setAuth({ authenticated: true, user: { id: "did:privy:bob" } });
    rerender(<AnalyticsProvider />);

    expect(vi.mocked(track).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(identifyUser).mock.invocationCallOrder[0]
    );
  });

  it("does not borrow A's cause for B when the switch reason was never recorded", () => {
    signedIn();
    const { rerender } = render(<AnalyticsProvider />);

    setAuth({ authenticated: true, user: { id: "did:privy:bob" } });
    rerender(<AnalyticsProvider />);

    expect(track).toHaveBeenCalledWith("logout", { reason: "user" });
  });

  it("reports nothing on a re-render that does not change the identity", () => {
    signedIn();
    const { rerender } = render(<AnalyticsProvider />);

    setAuth({ authenticated: true, user: { id: "did:privy:alice" } });
    rerender(<AnalyticsProvider />);

    expect(track).not.toHaveBeenCalledWith("logout", expect.anything());
  });

  it("reports once, not once per re-render after the transition", () => {
    signedIn();
    const { rerender } = render(<AnalyticsProvider />);

    loggedOut();
    rerender(<AnalyticsProvider />);
    rerender(<AnalyticsProvider />);
    rerender(<AnalyticsProvider />);

    expect(vi.mocked(track).mock.calls.filter(([name]) => name === "logout")).toHaveLength(1);
  });

  it("does not report a visitor who was never signed in", () => {
    loggedOut();
    render(<AnalyticsProvider />);

    expect(track).not.toHaveBeenCalledWith("logout", expect.anything());
    // The identity is still cleared — a reload into a signed-out state must
    // drop whatever Mixpanel persisted.
    expect(resetIdentity).toHaveBeenCalled();
  });

  it("does not report before Privy has resolved", () => {
    setAuth({ ready: false, authenticated: false });
    render(<AnalyticsProvider />);

    expect(track).not.toHaveBeenCalledWith("logout", expect.anything());
  });

  it("clears the reason, so the next sign-out does not inherit it", () => {
    signedIn();
    const { rerender } = render(<AnalyticsProvider />);

    beginLogout("wallet_disconnect", "did:privy:alice");
    loggedOut();
    rerender(<AnalyticsProvider />);

    signedIn();
    rerender(<AnalyticsProvider />);
    loggedOut();
    rerender(<AnalyticsProvider />);

    const reasons = vi
      .mocked(track)
      .mock.calls.filter(([name]) => name === "logout")
      .map(([, props]) => (props as { reason: string }).reason);
    expect(reasons).toEqual(["wallet_disconnect", "user"]);
  });
});
