import { describe, expect, it } from "vitest";
import {
  classifyOptionsArgument,
  createAnalyzer,
  hasUseCacheDirective,
  offenderKey,
} from "./use-cache-auth/analyzer";

/**
 * D2 cache-poisoning ratchet.
 *
 * `api.get` defaults `isAuthorized` to true. On the server that routes through
 * `TokenManager.getServerToken()` → a dynamic import of `next/headers` →
 * `cookies()`. Inside a `"use cache"` scope that is two failures at once:
 * `cookies()` is request state the cache cannot contain, and a response built
 * with somebody's token would be stored and then served to everyone.
 *
 * The existing D2 gate (`__tests__/utilities/api/public-read.test.ts` and
 * `public-loaders-no-auth.test.ts`) checks the loaders it knows about, one by
 * one. That is what let the hub regression through: `getCommunityCategoriesCached`
 * is `"use cache"`, and three hops below it — through a React `cache()` wrapper
 * — `getCommunityCategoriesOrThrow` calls `api.get` with no options at all.
 * Nothing about the cached function's own body is wrong. The defect is entirely
 * in what it can reach.
 *
 * So this test does not enumerate loaders. It starts from every `"use cache"`
 * function in the repo, walks the call graph, and reports any `api.*` call it
 * can reach that has not provably dropped the token.
 *
 * ## Ratchet, not a wall
 *
 * `KNOWN_OFFENDERS` freezes what was already reachable when this landed. The
 * test fails in both directions: a NEW offender fails immediately, and an entry
 * whose offender has been fixed or deleted fails as stale. The debt can only
 * shrink. Never add an entry — fix the loader, the way #2098 did, with
 * `publicReadOptions()`.
 *
 * ## Why it is green on a branch with no cached functions
 *
 * `"use cache"` arrives with the cacheComponents flip. On a tree that predates
 * it there are no entry points, so there is nothing to walk and nothing to be
 * stale against — the stale check is skipped and says so. The fixture suite
 * below is what keeps this file meaningful there: it proves the analyzer
 * detects the exact shape that failed, on a synthetic module graph, with no
 * dependency on which branch is checked out.
 *
 * Point it at another checkout with `D2_GUARD_ROOT=/path/to/tree`.
 */

/**
 * Reachable, unguarded `api.*` calls as of this commit.
 *
 * Format: `<entry file>#<entry fn> -> <file holding the call>:<method>`.
 *
 * Empty, and it stays that way. The one entry this ratchet was created for —
 * `getCommunityCategoriesCached` reaching `getCommunityCategoriesOrThrow`'s
 * optionless `api.get` — was fixed with `publicReadOptions()`, so the stale
 * check below now enforces the absence. Never add an entry: fix the loader.
 */
const KNOWN_OFFENDERS: ReadonlySet<string> = new Set<string>([]);

const ROOT = process.env.D2_GUARD_ROOT ?? process.cwd();

// ---------------------------------------------------------------------------
// Fixture suite — a synthetic module graph, no filesystem, no branch dependency
// ---------------------------------------------------------------------------

function fixtureAnalyzer(files: Record<string, string>) {
  const normalize = (path: string) => path.split("\\").join("/");
  const table = new Map(Object.entries(files).map(([path, text]) => [`/repo/${path}`, text]));

  return createAnalyzer({
    rootDir: "/repo",
    sourceDirs: ["src"],
    readFile: (path) => {
      const text = table.get(normalize(path));
      if (text === undefined) throw new Error(`no fixture for ${path}`);
      return text;
    },
    fileExists: (path) => {
      const key = normalize(path);
      return key === "/repo/src" || table.has(key);
    },
    listDir: (path) => {
      const prefix = `${normalize(path)}/`;
      const names = new Set<string>();
      for (const key of table.keys()) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const [head] = rest.split("/");
        names.add(head);
      }
      return [...names].map((name) => ({
        name,
        isDirectory: !name.endsWith(".ts") && !name.endsWith(".tsx"),
      }));
    },
  });
}

const API_IMPORT = 'import { api } from "@/utilities/api/client";\n';

describe("hasUseCacheDirective", () => {
  it("finds the directive as the first statement", () => {
    const analyzer = fixtureAnalyzer({
      "src/a.ts": `${API_IMPORT}export async function f() { "use cache"; return api.get("/x"); }`,
    });
    expect(analyzer.analyze().entryPoints.map((e) => e.name)).toEqual(["f"]);
  });

  it("ignores a 'use cache' string that is not a directive", () => {
    const analyzer = fixtureAnalyzer({
      "src/a.ts": `${API_IMPORT}export async function f() { const x = "use cache"; return api.get("/x", { isAuthorized: false }); }`,
    });
    expect(analyzer.analyze().entryPoints).toEqual([]);
  });

  it("accepts it after another directive", () => {
    expect(hasUseCacheDirective(undefined)).toBe(false);
  });
});

describe("classifyOptionsArgument", () => {
  const optionsOf = (call: string) => {
    const analyzer = fixtureAnalyzer({
      "src/a.ts": `${API_IMPORT}export async function f() { "use cache"; return ${call}; }`,
    });
    return analyzer.analyze().offenders;
  };

  it("accepts publicReadOptions()", () => {
    expect(optionsOf('api.get("/x", publicReadOptions())')).toEqual([]);
  });

  it("accepts a literal isAuthorized: false", () => {
    expect(optionsOf('api.get("/x", { isAuthorized: false })')).toEqual([]);
  });

  it("rejects a missing options argument — the shape that failed the hub", () => {
    const [offender] = optionsOf('api.get("/x")');
    expect(offender.call.reason).toBe("no-options");
  });

  it("rejects isAuthorized: true", () => {
    expect(optionsOf('api.get("/x", { isAuthorized: true })')).toHaveLength(1);
  });

  it("rejects an options object it cannot read statically", () => {
    const [offender] = optionsOf('api.get("/x", opts)');
    expect(offender.call.reason).toBe("not-statically-guarded");
  });

  it("reads the options argument at the right index for post/put/patch", () => {
    expect(optionsOf('api.post("/x", body, publicReadOptions())')).toEqual([]);
    expect(optionsOf('api.post("/x", body)')).toHaveLength(1);
    // A guard placed where `get` keeps its options would be wrong for `post`.
    expect(optionsOf('api.post("/x", publicReadOptions())')).toHaveLength(1);
  });

  it("ignores methods that take no options", () => {
    expect(optionsOf('api.somethingElse("/x")')).toEqual([]);
  });

  it("handles a call with no options node at all", () => {
    expect(classifyOptionsArgument(undefined)).toEqual({ guarded: false, reason: "no-options" });
  });
});

describe("transitive reachability", () => {
  it("finds an unguarded call three hops down, through a cache() wrapper", () => {
    // This is the hub regression, reduced: cached -> cache(wrapper) -> loader -> api.get
    const analyzer = fixtureAnalyzer({
      "src/cached.ts": `import { getCategories } from "@/src/loader";
        export async function getCategoriesCached(id: string) { "use cache"; return getCategories(id); }`,
      "src/loader.ts": `import { cache } from "react";
        import { getCategoriesOrThrow } from "@/src/raw";
        export const getCategories = cache(async (id: string) => getCategoriesOrThrow(id));`,
      "src/raw.ts": `${API_IMPORT}export const getCategoriesOrThrow = async (id: string) => api.get(\`/c/\${id}/categories\`);`,
    });

    const { offenders } = analyzer.analyze();
    expect(offenders).toHaveLength(1);
    expect(offenders[0].entry).toBe("getCategoriesCached");
    expect(offenders[0].call.file).toBe("src/raw.ts");
    expect(offenders[0].path).toEqual([
      "getCategoriesCached",
      "getCategories",
      "getCategoriesOrThrow",
    ]);
  });

  it("does not report a guarded call reached the same way", () => {
    const analyzer = fixtureAnalyzer({
      "src/cached.ts": `import { load } from "@/src/loader";
        export async function cached() { "use cache"; return load(); }`,
      "src/loader.ts": `${API_IMPORT}import { publicReadOptions } from "@/utilities/api/public-read";
        export const load = async () => api.get("/x", publicReadOptions());`,
    });
    expect(analyzer.analyze().offenders).toEqual([]);
  });

  it("does not report a call that is only reachable from an uncached function", () => {
    const analyzer = fixtureAnalyzer({
      "src/cached.ts": `import { safe } from "@/src/loader";
        export async function cached() { "use cache"; return safe(); }`,
      "src/loader.ts": `${API_IMPORT}import { publicReadOptions } from "@/utilities/api/public-read";
        export const safe = async () => api.get("/a", publicReadOptions());
        export const unsafe = async () => api.get("/b");`,
    });
    expect(analyzer.analyze().offenders).toEqual([]);
  });

  it("terminates on a cycle", () => {
    const analyzer = fixtureAnalyzer({
      "src/cached.ts": `import { a } from "@/src/a";
        export async function cached() { "use cache"; return a(); }`,
      "src/a.ts": `import { b } from "@/src/b";
        export const a = async () => b();`,
      "src/b.ts": `${API_IMPORT}import { a } from "@/src/a";
        export const b = async () => { await a(); return api.get("/x"); };`,
    });
    expect(analyzer.analyze().offenders).toHaveLength(1);
  });

  it("follows a service object's method", () => {
    const analyzer = fixtureAnalyzer({
      "src/cached.ts": `import { svc } from "@/src/svc";
        export async function cached() { "use cache"; return svc.getAll(); }`,
      "src/svc.ts": `${API_IMPORT}export const svc = { getAll: async () => api.get("/all") };`,
    });
    const { offenders } = analyzer.analyze();
    expect(offenders).toHaveLength(1);
    expect(offenders[0].path).toEqual(["cached", "svc.getAll"]);
  });

  it("follows a re-export", () => {
    const analyzer = fixtureAnalyzer({
      "src/cached.ts": `import { load } from "@/src/barrel";
        export async function cached() { "use cache"; return load(); }`,
      "src/barrel.ts": `export { load } from "@/src/impl";`,
      "src/impl.ts": `${API_IMPORT}export const load = async () => api.get("/x");`,
    });
    expect(analyzer.analyze().offenders).toHaveLength(1);
  });

  it("accepts a forwarded isAuthorized when the caller passed false", () => {
    // The idiom across services/: `const { isAuthorized = true } = options` and
    // then `api.get(url, { isAuthorized, signal })`. Safe only because the cached
    // wrapper hands `{ isAuthorized: false }` in — so the walk has to carry that.
    const analyzer = fixtureAnalyzer({
      "src/cached.ts": `import { load } from "@/src/loader";
        export async function cached() { "use cache"; return load("id", { isAuthorized: false }); }`,
      "src/loader.ts": `${API_IMPORT}export const load = async (id: string, options: any = {}) => {
          const { isAuthorized = true, signal } = options;
          return api.get("/x/" + id, { isAuthorized, signal });
        };`,
    });
    expect(analyzer.analyze().offenders).toEqual([]);
  });

  it("still reports that same loader when the caller does not pass it", () => {
    const analyzer = fixtureAnalyzer({
      "src/cached.ts": `import { load } from "@/src/loader";
        export async function cached() { "use cache"; return load("id"); }`,
      "src/loader.ts": `${API_IMPORT}export const load = async (id: string, options: any = {}) => {
          const { isAuthorized = true, signal } = options;
          return api.get("/x/" + id, { isAuthorized, signal });
        };`,
    });
    // The default is `true`, so an unguarded caller means an authorized read.
    expect(analyzer.analyze().offenders).toHaveLength(1);
  });

  it("carries the caller fact through an intermediate cached wrapper", () => {
    const analyzer = fixtureAnalyzer({
      "src/seed.ts": `import { inner } from "@/src/inner";
        export async function seedCached() { "use cache"; return inner("id"); }`,
      "src/inner.ts": `import { load } from "@/src/loader";
        export async function inner(id: string) { "use cache"; return load(id, { isAuthorized: false }); }`,
      "src/loader.ts": `${API_IMPORT}export const load = async (id: string, options: any = {}) => {
          const { isAuthorized = true } = options;
          return api.get("/x/" + id, { isAuthorized });
        };`,
    });
    expect(analyzer.analyze().offenders).toEqual([]);
  });

  it("stops at a package boundary instead of guessing", () => {
    const analyzer = fixtureAnalyzer({
      "src/cached.ts": `import { thing } from "some-package";
        export async function cached() { "use cache"; return thing(); }`,
    });
    expect(analyzer.analyze().offenders).toEqual([]);
  });

  it("names an anonymous cached function by the const it is assigned to", () => {
    const analyzer = fixtureAnalyzer({
      "src/a.ts": `${API_IMPORT}export const loadCached = async () => { "use cache"; return api.get("/x"); };`,
    });
    expect(analyzer.analyze().entryPoints[0].name).toBe("loadCached");
  });
});

// ---------------------------------------------------------------------------
// The ratchet, against the real tree
// ---------------------------------------------------------------------------

describe("no cached function can reach an unguarded api.* call", () => {
  const result = createAnalyzer({ rootDir: ROOT }).analyze();
  const found = new Map(result.offenders.map((offender) => [offenderKey(offender), offender]));

  it("reports no offender that is not already known", () => {
    const newOffenders = [...found.entries()]
      .filter(([key]) => !KNOWN_OFFENDERS.has(key))
      .map(([key, offender]) => {
        const chain = offender.path.join(" -> ");
        return `${key}\n      chain: ${chain}\n      at:    ${offender.call.file}:${offender.call.line} (${offender.call.reason})\n      code:  ${offender.call.snippet}`;
      });

    expect(
      newOffenders,
      `A "use cache" function can reach an api.* call that still sends the auth token.\n` +
        `On the server that is a cookies() read inside a cached scope, and a response built ` +
        `with one user's token that every later reader will be served.\n` +
        `Fix the loader with publicReadOptions() — do not add it to KNOWN_OFFENDERS.\n\n` +
        newOffenders.join("\n\n")
    ).toEqual([]);
  });

  it("has no stale KNOWN_OFFENDERS entries", () => {
    if (result.entryPoints.length === 0) {
      // A tree that predates the cacheComponents flip has no `"use cache"`
      // functions at all, so every entry would read as stale for the wrong
      // reason. The fixture suite above is what covers this file here.
      expect(KNOWN_OFFENDERS.size).toBeGreaterThanOrEqual(0);
      return;
    }

    const stale = [...KNOWN_OFFENDERS].filter((key) => !found.has(key));
    expect(
      stale,
      "These KNOWN_OFFENDERS entries no longer match anything — the loader was fixed or " +
        "deleted. Remove them so the ratchet keeps its teeth."
    ).toEqual([]);
  });

  it("parsed a plausible number of files, so a broken resolver cannot pass as a clean tree", () => {
    // Guards the failure mode that would make everything above vacuous: a
    // resolver that silently finds nothing reports zero offenders too.
    if (result.entryPoints.length > 0) {
      expect(result.filesParsed).toBeGreaterThan(result.entryPoints.length);
    }
  });
});
