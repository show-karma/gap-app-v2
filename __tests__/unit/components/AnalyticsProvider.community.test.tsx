/**
 * @file AnalyticsProvider — the community context it publishes, and the order
 * it writes in.
 *
 * Split out of `AnalyticsProvider.test.tsx`, which was over its size budget.
 * These two concerns belong together: the ordering cases exist because identity
 * has to settle before the community is written, and the community cases exist
 * because that write must be unconditional (Addendum G1).
 */

import { render } from "@testing-library/react";
import { AnalyticsProvider } from "@/components/Utilities/AnalyticsProvider";
import { __resetPendingLogoutReasonForTests } from "@/utilities/analytics/auth-transitions";
import {
  identifyUser,
  resetIdentity,
  setCommunityGroup,
  setCommunitySlug,
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

describe("AnalyticsProvider — write ordering", () => {
  const orderOf = (mock: { mock: { invocationCallOrder: number[] } }) =>
    mock.mock.invocationCallOrder[0];

  beforeEach(() => {
    vi.clearAllMocks();
    __resetPendingLogoutReasonForTests();
    usePathnameMock.mockReturnValue("/community/gitcoin");
    bindCommunity("0xcommunityuid");
    setAuth();
    setWhitelabel();
  });

  it("writes the group only after identity has settled", () => {
    setAuth({ authenticated: true, user: { id: "did:privy:alice" } });

    render(<AnalyticsProvider />);

    expect(setCommunityGroup).toHaveBeenCalledWith("0xcommunityuid");
    expect(orderOf(vi.mocked(identifyUser))).toBeLessThan(orderOf(vi.mocked(setCommunityGroup)));
    expect(orderOf(vi.mocked(setCommunityGroup))).toBeLessThan(orderOf(vi.mocked(trackPageView)));
  });

  it("writes no group at all before Privy has resolved", () => {
    // The layout has the uid and would have written it immediately. Mixpanel is
    // still holding whoever was signed in last, so that write would join THEM
    // to this community.
    setAuth({ ready: false });

    render(<AnalyticsProvider />);

    expect(setCommunityGroup).not.toHaveBeenCalled();
    expect(trackPageView).not.toHaveBeenCalled();
  });

  it("attributes nothing to the persisted user when Privy resolves to signed-out", () => {
    setAuth({ ready: false });
    const { rerender } = render(<AnalyticsProvider />);
    expect(setCommunityGroup).not.toHaveBeenCalled();

    setAuth({ ready: true, authenticated: false });
    rerender(<AnalyticsProvider />);

    // The persisted identity is dropped first, and only then is the community
    // written — so the group lands on the anonymous device, not on user A.
    expect(orderOf(vi.mocked(resetIdentity))).toBeLessThan(orderOf(vi.mocked(setCommunityGroup)));
  });

  it("attributes nothing to the persisted user when Privy resolves to a different user", () => {
    setAuth({ ready: false });
    const { rerender } = render(<AnalyticsProvider />);

    setAuth({ ready: true, authenticated: true, user: { id: "did:privy:bob" } });
    rerender(<AnalyticsProvider />);

    expect(identifyUser).toHaveBeenCalledWith("did:privy:bob", expect.any(Object));
    expect(orderOf(vi.mocked(identifyUser))).toBeLessThan(orderOf(vi.mocked(setCommunityGroup)));
    expect(orderOf(vi.mocked(identifyUser))).toBeLessThan(orderOf(vi.mocked(trackPageView)));
  });

  it("clears the binding on the way out of the community subtree", () => {
    setAuth({ authenticated: true, user: { id: "did:privy:alice" } });
    const { rerender } = render(<AnalyticsProvider />);

    usePathnameMock.mockReturnValue("/funding-map");
    bindCommunity(null);
    rerender(<AnalyticsProvider />);

    expect(setCommunityGroup).toHaveBeenLastCalledWith(null);
  });

  it("clears community A on the way to community B, even through the gap", () => {
    // Moving between two communities goes A -> null -> B: the old layout
    // unpublishes before the new one resolves. Returning early on that null
    // left the device bound to A, so anything emitted in the gap was
    // attributed to a community the visitor had already left.
    setAuth({ authenticated: true, user: { id: "did:privy:alice" } });
    bindCommunity("0xfirst", "first");
    const { rerender } = render(<AnalyticsProvider />);

    usePathnameMock.mockReturnValue("/community/second");
    bindCommunity(null);
    rerender(<AnalyticsProvider />);

    bindCommunity("0xsecond", "second");
    rerender(<AnalyticsProvider />);

    expect(vi.mocked(setCommunityGroup).mock.calls.map(([id]) => id)).toEqual([
      "0xfirst",
      null,
      "0xsecond",
    ]);
  });

  it("still holds the page view back while the new community is unresolved", () => {
    // Only the VIEW waits. The group must not.
    setAuth({ authenticated: true, user: { id: "did:privy:alice" } });
    bindCommunity("0xfirst", "first");
    const { rerender } = render(<AnalyticsProvider />);
    vi.mocked(trackPageView).mockClear();
    vi.mocked(setCommunityGroup).mockClear();

    usePathnameMock.mockReturnValue("/community/second");
    bindCommunity(null);
    rerender(<AnalyticsProvider />);

    expect(setCommunityGroup).toHaveBeenCalledWith(null);
    expect(trackPageView).not.toHaveBeenCalled();
  });

  it("republishes the same binding on every settled run, and lets the client dedupe", () => {
    // The dedupe deliberately does NOT live here. A ref holding "what was last
    // written" is empty on every fresh document while the super property it
    // mirrors is restored from localStorage, so it read as "already clear" and
    // never cleared anything (Addendum G1). `setCommunityGroup` compares
    // against Mixpanel's own persisted state instead, and skips the network
    // call itself — see the client's "writes nothing when already bound" test.
    setAuth({ authenticated: true, user: { id: "did:privy:alice" } });
    const { rerender } = render(<AnalyticsProvider />);

    usePathnameMock.mockReturnValue("/community/gitcoin/projects");
    rerender(<AnalyticsProvider />);

    expect(vi.mocked(setCommunityGroup).mock.calls.map(([id]) => id)).toEqual([
      "0xcommunityuid",
      "0xcommunityuid",
    ]);
  });
});

/**
 * `authenticated` is true before `user` arrives. During that gap there is no
 * identity to attribute anything to, and Mixpanel is still holding the previous
 * one.
 */
describe("AnalyticsProvider — community_slug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetPendingLogoutReasonForTests();
    bindCommunity("0xcommunityuid");
    setAuth();
    setWhitelabel();
  });

  it("registers the slug the layout resolved", () => {
    usePathnameMock.mockReturnValue("/community/gitcoin/projects");

    render(<AnalyticsProvider />);

    expect(setCommunitySlug).toHaveBeenCalledWith("gitcoin");
  });

  it("registers the canonical slug even when the visitor arrived by uid", () => {
    // `/community/[communityId]` accepts a uid, and reading the property off the
    // URL would put that uid into the one property whose job is to be readable.
    usePathnameMock.mockReturnValue("/community/0x8dfbdeadbeefdeadbeefdeadbeefdeadbeefdead");
    bindCommunity("0xcommunityuid", "gitcoin");

    render(<AnalyticsProvider />);

    expect(setCommunitySlug).toHaveBeenCalledWith("gitcoin");
  });

  it("registers nothing when the resolved community has no slug", () => {
    usePathnameMock.mockReturnValue("/community/gitcoin");
    bindCommunity("0xcommunityuid", null);

    render(<AnalyticsProvider />);

    expect(setCommunitySlug).not.toHaveBeenCalledWith(expect.any(String));
  });

  it("clears it on leaving the community", () => {
    usePathnameMock.mockReturnValue("/community/gitcoin");
    const { rerender } = render(<AnalyticsProvider />);

    usePathnameMock.mockReturnValue("/funding-map");
    bindCommunity(null);
    rerender(<AnalyticsProvider />);

    expect(setCommunitySlug).toHaveBeenLastCalledWith(null);
  });

  it("clears it on every settled run off a community route", () => {
    // Unconditional, not guarded by a ref holding "what was last written": on a
    // fresh document that ref is null while the super property has been
    // restored from localStorage, so the guard read as "already clear" and the
    // community the visitor left stayed on every later event (Addendum G1).
    usePathnameMock.mockReturnValue("/funding-map");
    bindCommunity(null);

    render(<AnalyticsProvider />);

    expect(setCommunitySlug).toHaveBeenCalledWith(null);
    expect(setCommunityGroup).toHaveBeenCalledWith(null);
  });

  it("waits for the layout before registering anything on a community route", () => {
    // Same reason the page view waits: a slug written from the URL would be
    // whatever segment the visitor followed, which may be a uid.
    usePathnameMock.mockReturnValue("/community/gitcoin");
    bindCommunity(null);

    render(<AnalyticsProvider />);

    expect(setCommunitySlug).not.toHaveBeenCalledWith(expect.any(String));
  });

  it("keeps community_id on the UID, never on the slug", () => {
    usePathnameMock.mockReturnValue("/community/gitcoin");

    render(<AnalyticsProvider />);

    expect(setCommunityGroup).toHaveBeenCalledWith("0xcommunityuid");
    expect(setCommunitySlug).not.toHaveBeenCalledWith("0xcommunityuid");
  });
});

/**
 * `useWhitelabel` returns a non-whitelabel default instead of throwing when it
 * is rendered outside its provider, so a broken nesting fails silently: every
 * tenant's traffic would report as `tenant: "karma"` and nobody would notice
 * until a whitelabel funnel came back empty. Assert the nesting structurally.
 */
