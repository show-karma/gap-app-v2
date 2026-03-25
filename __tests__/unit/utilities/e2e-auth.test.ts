import { getE2EMockAuthState } from "@/utilities/auth/e2e-auth";

const STORAGE_KEY = "privy:auth_state";

describe("getE2EMockAuthState", () => {
  const originalEnv = process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "true";
    delete (window as Window & { __e2e?: unknown; __playwright?: unknown }).__e2e;
    delete (window as Window & { __playwright?: unknown }).__playwright;
    localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;
    } else {
      process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = originalEnv;
    }
    delete (window as Window & { __e2e?: unknown }).__e2e;
    delete (window as Window & { __playwright?: unknown }).__playwright;
    localStorage.removeItem(STORAGE_KEY);
  });

  // ── Bypass disabled ─────────────────────────────────────────────────────────

  it("returns null when E2E bypass flag is not set", () => {
    delete process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;
    (window as Window & { __e2e?: unknown }).__e2e = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ authenticated: true }));

    expect(getE2EMockAuthState()).toBeNull();
  });

  it("returns null when E2E bypass flag is 'false'", () => {
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "false";
    (window as Window & { __e2e?: unknown }).__e2e = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ authenticated: true }));

    expect(getE2EMockAuthState()).toBeNull();
  });

  // ── No test runner detected ─────────────────────────────────────────────────

  it("returns null when neither __e2e nor __playwright is detected", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ authenticated: true }));

    expect(getE2EMockAuthState()).toBeNull();
  });

  // ── __e2e detected ────────────────────────────────────────────────────────

  it("returns auth state when __e2e flag is set and state is authenticated", () => {
    (window as Window & { __e2e?: unknown }).__e2e = true;
    const authState = {
      authenticated: true,
      ready: true,
      user: { wallet: { address: "0x1234" } },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));

    const result = getE2EMockAuthState();

    expect(result).toEqual(authState);
  });

  // ── Playwright detected ─────────────────────────────────────────────────────

  it("returns auth state when __playwright flag is set", () => {
    (window as Window & { __playwright?: unknown }).__playwright = {};
    const authState = {
      authenticated: true,
      user: { wallet: { address: "0xABCD" } },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));

    const result = getE2EMockAuthState();

    expect(result).toEqual(authState);
  });

  // ── Not authenticated ───────────────────────────────────────────────────────

  it("returns null when localStorage state has authenticated=false", () => {
    (window as Window & { __e2e?: unknown }).__e2e = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ authenticated: false }));

    expect(getE2EMockAuthState()).toBeNull();
  });

  // ── Missing/invalid localStorage ────────────────────────────────────────────

  it("returns null when localStorage has no auth state", () => {
    (window as Window & { __e2e?: unknown }).__e2e = true;

    expect(getE2EMockAuthState()).toBeNull();
  });

  it("returns null for malformed JSON in localStorage", () => {
    (window as Window & { __e2e?: unknown }).__e2e = true;
    localStorage.setItem(STORAGE_KEY, "{bad-json");

    expect(getE2EMockAuthState()).toBeNull();
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it("returns null when auth state is missing authenticated field", () => {
    (window as Window & { __e2e?: unknown }).__e2e = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ready: true, user: {} }));

    expect(getE2EMockAuthState()).toBeNull();
  });

  it("returns auth state with complete user wallet structure", () => {
    (window as Window & { __e2e?: unknown }).__e2e = true;
    const authState = {
      authenticated: true,
      ready: true,
      user: { wallet: { address: "0x9999999999999999999999999999999999999999" } },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authState));

    const result = getE2EMockAuthState();

    expect(result?.authenticated).toBe(true);
    expect(result?.user?.wallet?.address).toBe("0x9999999999999999999999999999999999999999");
  });
});
