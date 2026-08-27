/**
 * @file Tests for AnalyticsProvider — the component that keeps Mixpanel's
 * session state (tenant, identity, page) in step with the app.
 *
 * `useAuth`, `useWhitelabel` and `usePathname` are mocked so each transition
 * can be driven directly; the assertions are on the analytics client module,
 * which is the seam product code is allowed to depend on.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { AnalyticsProvider } from "@/components/Utilities/AnalyticsProvider";
import {
  __resetPendingLogoutReasonForTests,
  setPendingLogoutReason,
} from "@/utilities/analytics/auth-transitions";
import {
  identifyUser,
  registerSuperProperties,
  resetIdentity,
  track,
  trackPageView,
} from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({
  identifyUser: vi.fn(),
  registerSuperProperties: vi.fn(),
  resetIdentity: vi.fn(),
  setCommunityGroup: vi.fn(),
  track: vi.fn(),
  trackPageView: vi.fn(),
}));

/**
 * The community group is bound by the community layout from the RESOLVED uid,
 * not read off the URL — `/community/[communityId]` accepts a slug or a uid, so
 * the URL segment would split one community into two Mixpanel groups.
 */
const boundCommunityMock = vi.fn<() => string | null>(() => null);
vi.mock("@/utilities/analytics/community-group", () => ({
  useBoundCommunityId: () => boundCommunityMock(),
}));

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
    boundCommunityMock.mockReturnValue(null);
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
        community_id: null,
      });
    });

    it("reports the root path as the home group", () => {
      usePathnameMock.mockReturnValue("/");
      render(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledWith({
        route_pattern: "/",
        page_group: "home",
        community_id: null,
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
        community_id: null,
      });
    });

    it("reports the community by the uid the layout bound, not the URL segment", () => {
      usePathnameMock.mockReturnValue("/community/gitcoin/grants");
      boundCommunityMock.mockReturnValue("0xcommunityuid");

      render(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledWith({
        route_pattern: "/community/:communityId/grants",
        page_group: "community",
        community_id: "0xcommunityuid",
      });
    });

    it("waits for the layout to resolve the community before reporting the view", () => {
      // Emitting now and a corrected one a tick later would double-count the
      // view; a community page view without its community is not a useful row.
      usePathnameMock.mockReturnValue("/community/gitcoin");
      boundCommunityMock.mockReturnValue(null);

      const { rerender } = render(<AnalyticsProvider />);
      expect(trackPageView).not.toHaveBeenCalled();

      boundCommunityMock.mockReturnValue("0xcommunityuid");
      rerender(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledTimes(1);
      expect(trackPageView).toHaveBeenCalledWith(
        expect.objectContaining({ community_id: "0xcommunityuid" })
      );
    });

    it("does not wait for a community on a route that has none", () => {
      usePathnameMock.mockReturnValue("/project/my-project");
      boundCommunityMock.mockReturnValue(null);

      render(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledWith({
        route_pattern: "/project/:projectId",
        page_group: "project",
        community_id: null,
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

    it("reports one view for a remount on the same route", () => {
      // React Strict Mode mounts every effect twice in development, and any
      // remount replays it. The same route under the same identity is the same
      // view.
      usePathnameMock.mockReturnValue("/funding-map");
      const { rerender } = render(<AnalyticsProvider />);
      rerender(<AnalyticsProvider />);
      rerender(<AnalyticsProvider />);

      expect(trackPageView).toHaveBeenCalledTimes(1);
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
        community_id: null,
      });
    });
  });
});

/**
 * `useWhitelabel` returns a non-whitelabel default instead of throwing when it
 * is rendered outside its provider, so a broken nesting fails silently: every
 * tenant's traffic would report as `tenant: "karma"` and nobody would notice
 * until a whitelabel funnel came back empty. Assert the nesting structurally.
 */
describe("AnalyticsProvider mounting (layout nesting)", () => {
  const readSource = (relativePath: string) =>
    readFileSync(join(process.cwd(), relativePath), "utf-8");

  it("is rendered by DeferredLayoutComponents", () => {
    const source = readSource("components/DeferredLayoutComponents.tsx");

    expect(source).toContain("components/Utilities/AnalyticsProvider");
    expect(source).toContain("<AnalyticsProvider />");
  });

  it("mounts DeferredLayoutComponents inside WhitelabelProvider in the root layout", () => {
    const source = readSource("app/layout.tsx");

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

    setPendingLogoutReason("cross_tab");
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

    setPendingLogoutReason("wallet_disconnect");
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
