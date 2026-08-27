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
  identifyUser,
  registerSuperProperties,
  resetIdentity,
  setCommunityGroup,
  trackPageView,
} from "@/utilities/analytics/client";

vi.mock("@/utilities/analytics/client", () => ({
  identifyUser: vi.fn(),
  registerSuperProperties: vi.fn(),
  resetIdentity: vi.fn(),
  setCommunityGroup: vi.fn(),
  trackPageView: vi.fn(),
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
    usePathnameMock.mockReturnValue("/");
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
        route_pattern: "/project/:id/updates",
        page_group: "project",
        community_id: null,
      });
    });

    it("attaches the community group on a community route", () => {
      usePathnameMock.mockReturnValue("/community/gitcoin/grants");
      render(<AnalyticsProvider />);

      expect(setCommunityGroup).toHaveBeenCalledWith("gitcoin");
      expect(trackPageView).toHaveBeenCalledWith({
        route_pattern: "/community/:id/grants",
        page_group: "community",
        community_id: "gitcoin",
      });
    });

    it("clears the community group off community routes", () => {
      usePathnameMock.mockReturnValue("/project/my-project");
      render(<AnalyticsProvider />);

      expect(setCommunityGroup).toHaveBeenCalledWith(null);
    });

    it("sets the group before sending the page view so the view carries it", () => {
      usePathnameMock.mockReturnValue("/community/gitcoin");
      render(<AnalyticsProvider />);

      const groupOrder = vi.mocked(setCommunityGroup).mock.invocationCallOrder[0];
      const viewOrder = vi.mocked(trackPageView).mock.invocationCallOrder[0];
      expect(groupOrder).toBeLessThan(viewOrder);
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
