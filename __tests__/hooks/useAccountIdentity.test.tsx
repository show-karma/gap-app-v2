/**
 * Unit Tests: useAccountIdentity
 *
 * This is the single answer to "who is signed in", shared by the navbar's
 * account button and the identity hint published to a tenant's marketing site.
 * It exists because those two derived it separately and disagreed — the button
 * showed a name, the hint the raw address for the same person.
 *
 * So the cases below are the chain itself, in order. A change here changes both
 * surfaces at once, which is the point.
 */

import { renderHook } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  auth: { authenticated: true, user: null as any, address: undefined as string | undefined },
  contributorProfile: null as any,
  ensData: {} as Record<string, { name?: string | null; avatar?: string | null }>,
  profiles: {} as Record<string, any>,
  populateEns: vi.fn(),
  populateProfiles: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/hooks/useContributorProfile", () => ({
  useContributorProfile: () => ({ profile: mocks.contributorProfile }),
}));
vi.mock("@/store/ens", () => ({
  useENS: (selector: any) => selector({ ensData: mocks.ensData, populateEns: mocks.populateEns }),
}));
vi.mock("@/store/userProfiles", () => ({
  useUserProfiles: (selector: any) =>
    selector({ profiles: mocks.profiles, populateProfiles: mocks.populateProfiles }),
}));

import { useAccountIdentity } from "@/hooks/useAccountIdentity";

const ADDRESS = "0x9b75aaBc1234567890abcdef1234567890a19A4b";
const LOWER = ADDRESS.toLowerCase();

beforeEach(() => {
  mocks.auth = { authenticated: true, user: null, address: ADDRESS };
  mocks.contributorProfile = null;
  mocks.ensData = {};
  mocks.profiles = {};
  vi.clearAllMocks();
});

const name = () => renderHook(() => useAccountIdentity()).result.current.name;
const avatar = () => renderHook(() => useAccountIdentity()).result.current.avatar;

describe("name, in the account button's order", () => {
  it("1. prefers the Farcaster display name", () => {
    mocks.auth.user = {
      farcaster: { displayName: "Metro Boomin2", username: "metro" },
      email: { address: "a@b.co" },
    };
    mocks.contributorProfile = { data: { name: "Contributor" } };

    expect(name()).toBe("Metro Boomin2");
  });

  it("1b. falls back to the Farcaster username", () => {
    mocks.auth.user = { farcaster: { username: "metro" } };

    expect(name()).toBe("metro");
  });

  it("2. then the email Privy holds — in full, as the button shows it", () => {
    mocks.auth.user = { email: { address: "amaury@example.com" } };
    mocks.contributorProfile = { data: { name: "Contributor" } };

    expect(name()).toBe("amaury@example.com");
  });

  it("2b. including a Google login's email", () => {
    mocks.auth.user = { google: { email: "g@example.com" } };

    expect(name()).toBe("g@example.com");
  });

  it("3. then the contributor profile name", () => {
    mocks.contributorProfile = { data: { name: "Metro Boomin2" } };

    expect(name()).toBe("Metro Boomin2");
  });

  it("4. then the Privy profile name from the profiles store", () => {
    mocks.profiles = { [LOWER]: { name: "Stored Name", isTried: true } };

    expect(name()).toBe("Stored Name");
  });

  it("4b. ignores a profile entry that has not been tried yet", () => {
    // Mid-flight, `name` is an empty placeholder — using it would flash a blank.
    mocks.profiles = { [LOWER]: { name: "", isFetching: true } };
    mocks.ensData = { [LOWER]: { name: "metro.eth" } };

    expect(name()).toBe("metro.eth");
  });

  it("5. then the ENS name", () => {
    mocks.ensData = { [LOWER]: { name: "metro.eth" } };

    expect(name()).toBe("metro.eth");
  });

  it("6. then a provider handle", () => {
    mocks.auth.user = { google: { name: "Ada Lovelace" } };

    expect(name()).toBe("Ada Lovelace");
  });

  it("7. and finally the truncated address", () => {
    expect(name()).toBe("0x9b75...a19a4b");
  });

  it("is undefined when there is no address and nothing else resolved", () => {
    // Authenticated but still hydrating: the caller must not publish a
    // placeholder, so this has to be distinguishable from a real name.
    mocks.auth.address = undefined;

    expect(name()).toBeUndefined();
  });
});

describe("avatar", () => {
  it("prefers the Farcaster picture", () => {
    mocks.auth.user = { farcaster: { username: "metro", pfp: "https://img/f.png" } };
    mocks.profiles = { [LOWER]: { picture: "https://img/p.png", isTried: true } };

    expect(avatar()).toBe("https://img/f.png");
  });

  it("then the Privy profile picture", () => {
    mocks.profiles = { [LOWER]: { picture: "https://img/p.png", isTried: true } };
    mocks.ensData = { [LOWER]: { avatar: "https://img/e.png" } };

    expect(avatar()).toBe("https://img/p.png");
  });

  it("then the ENS avatar", () => {
    mocks.ensData = { [LOWER]: { avatar: "https://img/e.png" } };

    expect(avatar()).toBe("https://img/e.png");
  });

  it("is undefined when none resolved, leaving the identicon to the caller", () => {
    expect(avatar()).toBeUndefined();
  });
});

describe("populating the stores it reads", () => {
  it("asks for ENS and the Privy profile when neither is present", () => {
    renderHook(() => useAccountIdentity());

    // The button used to render a component that did this. It no longer does,
    // so the hook must — otherwise step 4 and 5 would never resolve.
    expect(mocks.populateEns).toHaveBeenCalledWith([LOWER]);
    expect(mocks.populateProfiles).toHaveBeenCalledWith([LOWER]);
  });

  it("does not re-ask once an entry is there", () => {
    mocks.ensData = { [LOWER]: { name: "metro.eth" } };
    mocks.profiles = { [LOWER]: { name: "Stored", isTried: true } };

    renderHook(() => useAccountIdentity());

    expect(mocks.populateEns).not.toHaveBeenCalled();
    expect(mocks.populateProfiles).not.toHaveBeenCalled();
  });
});
