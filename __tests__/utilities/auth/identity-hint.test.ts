/**
 * Unit Tests: identity hint
 *
 * The hint tells the tenant's marketing site who is signed in. It is display
 * data with no authority (see identity-hint.ts), so what matters here is that
 * it lands only where it is allowed to and comes off cleanly on sign-out — a
 * hint outliving its session is the failure mode that makes the button lie.
 *
 * What it *says* is not decided here: the name and picture come from
 * `useAccountIdentity`, shared with the navbar button, so the two cannot
 * disagree about who you are.
 */

import {
  canWriteHint,
  clearIdentityHint,
  IDENTITY_HINT_COOKIE,
  writeIdentityHint,
} from "@/utilities/auth/identity-hint";

const DOMAIN = ".filpgf.io";

const readCookie = () => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${IDENTITY_HINT_COOKIE}=([^;]*)`));
  return match ? JSON.parse(decodeURIComponent(match[1])) : null;
};

describe("canWriteHint", () => {
  it("allows the domain itself and its subdomains", () => {
    expect(canWriteHint("filpgf.io", DOMAIN)).toBe(true);
    expect(canWriteHint("www.filpgf.io", DOMAIN)).toBe(true);
    expect(canWriteHint("app.filpgf.io", DOMAIN)).toBe(true);
  });

  it("accepts the domain written without a leading dot", () => {
    expect(canWriteHint("app.filpgf.io", "filpgf.io")).toBe(true);
  });

  it("refuses a host outside the domain", () => {
    // The filecoin tenant also serves grants.filecoin.io, which shares no
    // cookie jar with filpgf.io — the browser would drop the write silently.
    expect(canWriteHint("grants.filecoin.io", DOMAIN)).toBe(false);
    expect(canWriteHint("karmahq.org", DOMAIN)).toBe(false);
  });

  it("refuses a lookalike host that merely ends with the same text", () => {
    expect(canWriteHint("notfilpgf.io", DOMAIN)).toBe(false);
  });

  it("refuses when the tenant declares no domain", () => {
    expect(canWriteHint("app.filpgf.io", undefined)).toBe(false);
  });

  it("allows localhost, where the app and the site share a jar across ports", () => {
    expect(canWriteHint("localhost", DOMAIN)).toBe(true);
    expect(canWriteHint("127.0.0.1", DOMAIN)).toBe(true);
  });
});

describe("writeIdentityHint / clearIdentityHint", () => {
  // jsdom serves these tests from localhost, which is the branch that omits the
  // Domain attribute — the same path local dev takes.
  afterEach(() => {
    clearIdentityHint(DOMAIN);
  });

  it("round-trips a hint through the cookie", () => {
    writeIdentityHint({ v: 1, name: "Ada Lovelace", avatar: "https://img/a.png" }, DOMAIN);

    expect(readCookie()).toEqual({ v: 1, name: "Ada Lovelace", avatar: "https://img/a.png" });
  });

  it("encodes a name containing cookie punctuation", () => {
    // A display name is user-controlled; a stray ";" would truncate the cookie
    // and, worse, could introduce an attribute.
    writeIdentityHint({ v: 1, name: "a; domain=evil.com" }, DOMAIN);

    expect(readCookie()).toEqual({ v: 1, name: "a; domain=evil.com" });
  });

  it("clears the cookie", () => {
    writeIdentityHint({ v: 1, name: "Ada" }, DOMAIN);
    expect(readCookie()).not.toBeNull();

    clearIdentityHint(DOMAIN);

    expect(readCookie()).toBeNull();
  });

  it("writes nothing when the tenant declares no domain", () => {
    writeIdentityHint({ v: 1, name: "Ada" }, undefined);

    expect(readCookie()).toBeNull();
  });
});
