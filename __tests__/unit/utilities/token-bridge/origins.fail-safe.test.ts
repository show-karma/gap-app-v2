/**
 * The token bridge hands a signed-in visitor's access token to whoever frames
 * it, so the set of origins it answers is a security boundary. These tests pin
 * which build environments relax that set and, above all, that every unknown
 * or missing environment keeps it restricted.
 *
 * Env vars are set with vi.stubEnv and removed with `undefined`: assigning
 * `process.env.X = undefined` stores the STRING "undefined", which happens to
 * be "not preview" and would hide a regression in the missing-variable case.
 */
import {
  allTokenBridgeOrigins,
  isAllowedBridgeOrigin,
  TOKEN_BRIDGE_ORIGINS,
  TOKEN_BRIDGE_PREVIEW_FRAME_ORIGINS,
  TOKEN_BRIDGE_PREVIEW_ORIGINS,
  tokenBridgeAllowsPreviewOrigins,
  tokenBridgeOriginsFor,
} from "@/utilities/token-bridge/origins";

const ENV_KEYS = [
  "APP_ENV",
  "NEXT_PUBLIC_APP_ENV",
  "VERCEL_ENV",
  "NEXT_PUBLIC_VERCEL_ENV",
] as const;

type EnvKey = (typeof ENV_KEYS)[number];

const FILECOIN = TOKEN_BRIDGE_ORIGINS.filecoin ?? [];
const RELAXED_BRIDGE = [...FILECOIN, ...TOKEN_BRIDGE_PREVIEW_ORIGINS];
const RELAXED_FRAME = [...FILECOIN, ...TOKEN_BRIDGE_PREVIEW_FRAME_ORIGINS];

/** A production build with exactly the given deployment variables set. */
function productionBuild(vars: Partial<Record<EnvKey, string>> = {}) {
  vi.stubEnv("NODE_ENV", "production");
  for (const key of ENV_KEYS) {
    vi.stubEnv(key, vars[key]);
  }
}

function expectRestricted() {
  expect(tokenBridgeAllowsPreviewOrigins()).toBe(false);
  expect(tokenBridgeOriginsFor("filecoin")).toEqual(FILECOIN);
  expect(allTokenBridgeOrigins()).toEqual(FILECOIN);
}

function expectRelaxed() {
  expect(tokenBridgeAllowsPreviewOrigins()).toBe(true);
  expect(tokenBridgeOriginsFor("filecoin")).toEqual(RELAXED_BRIDGE);
  expect(allTokenBridgeOrigins()).toEqual(RELAXED_FRAME);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("token bridge allowlist — fail-safe on a production build", () => {
  it("stays restricted when no deployment variable is set at all", () => {
    productionBuild();
    expectRestricted();
  });

  it.each([
    ["VERCEL_ENV", ""],
    ["NEXT_PUBLIC_VERCEL_ENV", ""],
  ] as const)("stays restricted when %s is set but empty", (key, value) => {
    productionBuild({ [key]: value });
    expectRestricted();
  });

  it.each([
    ["VERCEL_ENV", "production"],
    ["NEXT_PUBLIC_VERCEL_ENV", "production"],
    ["VERCEL_ENV", "development"],
    ["NEXT_PUBLIC_VERCEL_ENV", "development"],
  ] as const)("stays restricted when %s=%s — only preview relaxes", (key, value) => {
    productionBuild({ [key]: value });
    expectRestricted();
  });

  it.each(["Preview", "PREVIEW", " preview", "preview ", "staging", "undefined"])(
    "stays restricted for a value that is not exactly 'preview' (%j)",
    (value) => {
      productionBuild({ VERCEL_ENV: value, NEXT_PUBLIC_VERCEL_ENV: value });
      expectRestricted();
    }
  );

  it("stays restricted when both Vercel variables say production", () => {
    productionBuild({ VERCEL_ENV: "production", NEXT_PUBLIC_VERCEL_ENV: "production" });
    expectRestricted();
  });
});

describe("token bridge allowlist — what relaxes it today (Vercel)", () => {
  it("relaxes on a Vercel preview build seen through VERCEL_ENV (build time)", () => {
    productionBuild({ VERCEL_ENV: "preview" });
    expectRelaxed();
  });

  it("relaxes on a Vercel preview seen through NEXT_PUBLIC_VERCEL_ENV (client bundle)", () => {
    productionBuild({ NEXT_PUBLIC_VERCEL_ENV: "preview" });
    expectRelaxed();
  });

  it("relaxes when both Vercel variables say preview", () => {
    productionBuild({ VERCEL_ENV: "preview", NEXT_PUBLIC_VERCEL_ENV: "preview" });
    expectRelaxed();
  });

  it.each(["development", "test"])("relaxes outside a production build (NODE_ENV=%s)", (env) => {
    vi.stubEnv("NODE_ENV", env);
    for (const key of ENV_KEYS) vi.stubEnv(key, undefined);
    expectRelaxed();
  });

  it("never gives a tenant without an embedder anything, even when relaxed", () => {
    productionBuild({ VERCEL_ENV: "preview" });
    expect(tokenBridgeOriginsFor("karma")).toEqual([]);
    expect(tokenBridgeOriginsFor(null)).toEqual([]);
    expect(tokenBridgeOriginsFor(undefined)).toEqual([]);
    expect(tokenBridgeOriginsFor("")).toEqual([]);
  });
});

describe("token bridge allowlist — negative origin fixtures", () => {
  // Hosts that must never be answered by a production build. Each one is a
  // shape an attacker can actually register or serve from.
  const NEVER_IN_PRODUCTION = [
    // Preview and local embedders are preview-only.
    "https://filpgf-abc123-karma.vercel.app",
    "https://filpgf-git-main-karma.vercel.app",
    "http://localhost:4321",
    "http://localhost:4342",
    "http://localhost:4343",
    // Lookalikes of the production landing site.
    "https://fakefilpgf.io",
    "https://filpgf.io.evil.com",
    "https://www.filpgf.io.evil.com",
    "https://evil.filpgf.io",
    "https://app.filpgf.io",
    "https://wwwfilpgf.io",
    "https://filpgf.iox",
    // Right host, wrong scheme or port.
    "http://filpgf.io",
    "http://www.filpgf.io",
    "https://www.filpgf.io:8443",
    // Not a bare, normalised origin.
    "https://www.filpgf.io/",
    "https://www.filpgf.io/auth",
    "https://WWW.FILPGF.IO",
    "https://www.filpgf.io:443",
    "https://user@www.filpgf.io",
    "https://www.filpgf.io.",
    "null",
    "",
  ];

  it.each(NEVER_IN_PRODUCTION)("a production build refuses %j", (origin) => {
    productionBuild();
    expect(isAllowedBridgeOrigin(origin, tokenBridgeOriginsFor("filecoin"))).toBe(false);
  });

  it.each(["https://filpgf.io", "https://www.filpgf.io"])(
    "a production build answers the landing site %j",
    (origin) => {
      productionBuild();
      expect(isAllowedBridgeOrigin(origin, tokenBridgeOriginsFor("filecoin"))).toBe(true);
    }
  );

  // Even a preview build answers only the landing site's own previews: anyone
  // can deploy to vercel.app.
  const NEVER_IN_PREVIEW = [
    "https://anyone.vercel.app",
    "https://evil-filpgf-x.vercel.app",
    "https://filpgf-x.evil.vercel.app",
    "https://filpgf-.vercel.app",
    "https://filpgf-abc.vercel.app.evil.com",
    "https://filpgf-abc.vercel.app:443",
    "http://filpgf-abc.vercel.app",
    "https://vercel.app",
    "https://fakefilpgf.io",
    "http://localhost:3000",
    "http://127.0.0.1:4321",
  ];

  it.each(NEVER_IN_PREVIEW)("a preview build still refuses %j", (origin) => {
    productionBuild({ VERCEL_ENV: "preview" });
    expect(isAllowedBridgeOrigin(origin, tokenBridgeOriginsFor("filecoin"))).toBe(false);
  });

  it.each(["https://filpgf-abc123-karma.vercel.app", "http://localhost:4321"])(
    "a preview build answers the landing site's preview %j",
    (origin) => {
      productionBuild({ VERCEL_ENV: "preview" });
      expect(isAllowedBridgeOrigin(origin, tokenBridgeOriginsFor("filecoin"))).toBe(true);
    }
  );

  it("never lists the bare *.vercel.app wildcard in a production frame-ancestors", () => {
    productionBuild();
    expect(allTokenBridgeOrigins()).not.toContain("https://*.vercel.app");
  });
});
