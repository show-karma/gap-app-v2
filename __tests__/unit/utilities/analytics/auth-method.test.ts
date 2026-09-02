/**
 * @file Tests for the Privy → catalog auth-method mapping.
 *
 * Privy names the same identity differently on either side of its API
 * (`loginMethod: "siwe"` vs `linkedAccount.type: "wallet"`); this module is
 * what stops `login_completed.auth_method` and the `auth_method` super property
 * disagreeing in the same report.
 */

import {
  linkedAccountTypes,
  primaryAuthMethod,
  toAuthMethod,
} from "@/utilities/analytics/auth-method";

describe("toAuthMethod", () => {
  it.each([
    ["email", "email"],
    ["google", "google"],
    ["google_oauth", "google"],
    ["farcaster", "farcaster"],
    ["wallet", "wallet"],
    ["siwe", "wallet"],
    ["siws", "wallet"],
  ])("maps Privy's %s onto %s", (raw, expected) => {
    expect(toAuthMethod(raw)).toBe(expected);
  });

  it.each([[null], [undefined], [""], ["telegram"], ["passkey"]])(
    "collapses %s to unknown rather than inventing a cohort",
    (raw) => {
      expect(toAuthMethod(raw)).toBe("unknown");
    }
  );
});

describe("linkedAccountTypes", () => {
  it("preserves order and drops duplicates", () => {
    expect(linkedAccountTypes([{ type: "email" }, { type: "wallet" }, { type: "wallet" }])).toEqual(
      ["email", "wallet"]
    );
  });

  it.each([[undefined], [null], [[]]])("returns an empty list for %s", (accounts) => {
    expect(linkedAccountTypes(accounts)).toEqual([]);
  });
});

describe("primaryAuthMethod", () => {
  it("prefers the social identity over a wallet the user merely linked", () => {
    expect(primaryAuthMethod(["wallet", "google_oauth"])).toBe("google");
  });

  it("reports a wallet-only user as wallet", () => {
    expect(primaryAuthMethod(["wallet"])).toBe("wallet");
  });

  it("prefers a known method over one the catalog does not model", () => {
    expect(primaryAuthMethod(["telegram", "email"])).toBe("email");
  });

  it("falls back to a linked wallet when nothing else is recognised", () => {
    expect(primaryAuthMethod(["telegram", "wallet"])).toBe("wallet");
  });

  it("returns unknown for a user with no recognised identity at all", () => {
    expect(primaryAuthMethod(["telegram"])).toBe("unknown");
    expect(primaryAuthMethod([])).toBe("unknown");
  });
});
