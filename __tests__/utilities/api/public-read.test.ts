import authPosture from "@/__tests__/fixtures/d2/indexer-auth-posture.json";
import parity from "@/__tests__/fixtures/d2/public-payload-parity.json";
import { isServerRead, publicReadOptions } from "@/utilities/api/public-read";

/**
 * The D2 gate.
 *
 * The four public loaders drop the `Authorization` header on the server so that
 * (a) the render stops reading `cookies()` and can be prerendered, and (b) the
 * payload they produce is safe to cache — a cached response built with somebody's
 * token would be served to everyone.
 *
 * The evidence is in three layers, none of which needs the network at test time:
 *
 * 1. `publicReadOptions()` itself: authorized on the client, never on the server.
 * 2. The indexer's auth posture for every endpoint these loaders read, pinned from
 *    the gap-indexer route definitions. A route with no auth preHandler cannot
 *    behave differently with or without the header — that is a proof, not a sample.
 * 3. A recording against the staging indexer showing each endpoint answers 200 with
 *    a complete public payload and no credential.
 *
 * The one thing not covered here is a live diff against a *staff* session, which
 * needs a staging Privy JWT this suite does not have. Layer 2 pins what such a
 * session would add — three ingestion-provenance fields on program-registry, gated
 * on `isStaff` — and both consumers of those fields fetch on the client.
 * `.phase2/record-parity.mjs` performs the live diff when given `INDEXER_TOKEN`.
 */

describe("publicReadOptions", () => {
  const realWindow = globalThis.window;

  afterEach(() => {
    if (realWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        value: realWindow,
        configurable: true,
        writable: true,
      });
    }
  });

  function asServer() {
    Reflect.deleteProperty(globalThis, "window");
  }

  it("drops the token on the server, where cookies() would make the route dynamic", () => {
    asServer();

    expect(isServerRead()).toBe(true);
    expect(publicReadOptions()).toEqual({ isAuthorized: false });
  });

  it("keeps the token on the client, so a signed-in user still gets their own view", () => {
    expect(isServerRead()).toBe(false);
    expect(publicReadOptions()).toEqual({ isAuthorized: true });
  });
});

describe("D2 — indexer auth posture of the public loaders' endpoints", () => {
  const publicEndpoints = authPosture.endpoints.filter((e) => e.posture === "PUBLIC");
  const optionalAuth = authPosture.endpoints.filter((e) => e.posture === "optionalAuthentication");

  it("covers every endpoint the public loaders read", () => {
    const loaders = new Set(authPosture.endpoints.map((e) => e.loader));

    expect(loaders).toEqual(
      new Set([
        "services/projects-explorer.service.ts",
        "services/project.service.ts",
        "utilities/queries/v2/getCommunityData.ts",
        "src/features/funding-map/services/funding-programs.service.ts",
        // Joined in the pre-flip cleanup: its two server readers (the manage
        // portfolio-reports config and milestones-report pages) were still
        // reaching cookies() through the default authorized read.
        "services/community-programs.service.ts",
      ])
    );
  });

  // A route with no auth preHandler never reads the header, so dropping the token
  // cannot change a single byte. This is the whole argument for six of the eight.
  it("has six endpoints where the Authorization header is never read at all", () => {
    expect(publicEndpoints.map((e) => e.path).sort()).toEqual([
      "/v2/communities/:slug/projects",
      "/v2/communities/:slug/stats",
      "/v2/communities/:uidOrSlug",
      "/v2/communities/:uidOrSlug/programs",
      "/v2/projects",
      "/v2/projects/:identifier",
    ]);
  });

  // The two that can differ, and by exactly how much. If the indexer ever widens
  // this, re-record the fixture and this test fails until someone has looked.
  it("has exactly two optional-auth endpoints, both adding only staff ingestion fields", () => {
    expect(optionalAuth.map((e) => e.path).sort()).toEqual([
      "/v2/program-registry/:programId",
      "/v2/program-registry/search",
    ]);

    for (const endpoint of optionalAuth) {
      expect(endpoint.sessionAddsFields).toEqual([
        "metadata.ingestionSource",
        "metadata.ingestionRunId",
        "metadata.rawData",
      ]);
      expect(endpoint.gatedOn).toContain("isStaff");
    }
  });

  // If a staff-only field were rendered from the server prefetch, dropping the
  // token would visibly change the page for staff. Both consumers are client
  // fetches, so they keep their token and nothing regresses.
  it("has no server-rendered consumer of the staff-only fields", () => {
    for (const consumer of authPosture.staffOnlyFieldConsumers) {
      expect(consumer.dataPath).toMatch(/^client/);
    }
  });
});

describe("D2 — recorded public payloads", () => {
  it("was recorded against the staging indexer", () => {
    expect(parity.recordedAgainst).toBe("https://gapstagapi.karmahq.xyz");
  });

  it("answers 200 with a populated payload for every endpoint, with no credential", () => {
    expect(parity.endpoints.length).toBeGreaterThanOrEqual(7);

    for (const endpoint of parity.endpoints) {
      expect(endpoint.anonStatus, `${endpoint.name} anonymous status`).toBe(200);
      // A public payload that came back near-empty would mean the endpoint hides
      // its content from anonymous callers, which is the failure this guards.
      expect(endpoint.anonKeyCount, `${endpoint.name} anonymous payload size`).toBeGreaterThan(10);
    }
  });
});
