import { describe, expect, it } from "vitest";
import {
  FALLBACK_BLOG_SLUGS,
  FALLBACK_GRANT_PAIRS,
  FALLBACK_PROGRAM_PAIRS,
  FALLBACK_PROJECT_SLUGS,
  withPrerenderFallback,
} from "@/utilities/prerender-samples";

/**
 * @file Pins the `generateStaticParams` fallbacks.
 *
 * Two jobs, and the first is the one that actually breaks builds:
 *
 * 1. The shape contract — a sampler may never return `[]`. Under
 *    cacheComponents that is `error: empty-generate-static-params` at page-data
 *    collection, which kills the build before a single route is prerendered.
 *    These run everywhere, offline included.
 *
 * 2. The parity contract — the checked-in ids still resolve upstream. A
 *    fabricated or rotted id prerenders a 404 into the build, which is worse
 *    than no sample because it looks like success. These need the indexer, so
 *    they are opt-in via RUN_PRERENDER_PARITY=1 and are skipped by default in
 *    CI and locally.
 */

const HEX_UID = /^0x[0-9a-f]{64}$/;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

const INDEXER = process.env.NEXT_PUBLIC_GAP_INDEXER_URL ?? "https://gapapi.karmahq.xyz";
const runParity = process.env.RUN_PRERENDER_PARITY === "1";

describe("prerender sample fallbacks — shape", () => {
  it("every fallback list is non-empty", () => {
    // The whole point of the fallbacks. If one of these is ever emptied, the
    // build fails at collection with no route-level clue as to why.
    expect(FALLBACK_PROJECT_SLUGS.length).toBeGreaterThan(0);
    expect(FALLBACK_GRANT_PAIRS.length).toBeGreaterThan(0);
    expect(FALLBACK_PROGRAM_PAIRS.length).toBeGreaterThan(0);
    expect(FALLBACK_BLOG_SLUGS.length).toBeGreaterThan(0);
  });

  it("withPrerenderFallback never returns an empty list", () => {
    expect(withPrerenderFallback([], ["a"])).toEqual(["a"]);
    expect(withPrerenderFallback(["found"], ["a"])).toEqual(["found"]);
    // The degenerate case is still worth stating: two empty inputs cannot
    // produce a usable sample, and a caller that manages it has a bug.
    expect(withPrerenderFallback([], [])).toEqual([]);
  });

  it("ids are well formed, so a typo cannot reach a build", () => {
    for (const slug of FALLBACK_PROJECT_SLUGS) expect(slug).toMatch(SLUG);
    for (const slug of FALLBACK_BLOG_SLUGS) expect(slug).toMatch(SLUG);
    for (const { projectId, grantUid } of FALLBACK_GRANT_PAIRS) {
      expect(projectId).toMatch(SLUG);
      expect(grantUid).toMatch(HEX_UID);
    }
    for (const { communityId, programId } of FALLBACK_PROGRAM_PAIRS) {
      expect(communityId).toMatch(SLUG);
      expect(programId).toMatch(/^\d+$/);
    }
  });

  it("the grant fallback only names projects the project fallback also prerenders", () => {
    // The two samplers have to agree, or the grant pages prerender for a
    // project whose own routes were never sampled.
    for (const { projectId } of FALLBACK_GRANT_PAIRS) {
      expect(FALLBACK_PROJECT_SLUGS).toContain(projectId);
    }
  });
});

describe.skipIf(!runParity)("prerender sample fallbacks — parity with the indexer", () => {
  it("every fallback project resolves", async () => {
    for (const slug of FALLBACK_PROJECT_SLUGS) {
      const response = await fetch(`${INDEXER}/v2/projects/${slug}`);
      expect(response.status, `project ${slug}`).toBe(200);
    }
  }, 60_000);

  it("every fallback grant uid is still a grant on its project", async () => {
    for (const { projectId, grantUid } of FALLBACK_GRANT_PAIRS) {
      const response = await fetch(`${INDEXER}/v2/projects/${projectId}/grants`);
      expect(response.status, `grants for ${projectId}`).toBe(200);

      const body = (await response.json()) as Array<{ uid?: string }> | { uid?: string };
      const grants = Array.isArray(body) ? body : [body];
      expect(
        grants.map((grant) => grant.uid),
        `grant ${grantUid} on ${projectId}`
      ).toContain(grantUid);
    }
  }, 60_000);

  it("every fallback program still exists on its community", async () => {
    for (const { communityId, programId } of FALLBACK_PROGRAM_PAIRS) {
      const response = await fetch(
        `${INDEXER}/v2/funding-program-configs/community/${communityId}`
      );
      expect(response.status, `programs for ${communityId}`).toBe(200);

      const body = (await response.json()) as Array<{ programId?: string | number }>;
      const ids = (Array.isArray(body) ? body : []).map((program) => String(program.programId));
      expect(ids, `program ${programId} on ${communityId}`).toContain(programId);
    }
  }, 60_000);
});
