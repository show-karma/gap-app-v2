import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Architecture guardrail for the /updates and /financials public community routes.
 *
 * These routes are read-only and must NOT pull in the Safe SDK (`@safe-global/*`) or the
 * `utilities/safe.ts` module that statically imported it. Doing so shipped a deep ethers v6
 * class hierarchy into the public route's vendor chunks, which webpack could split in a broken
 * order and crash at runtime with "Class extends value undefined is not a constructor" (a TDZ
 * failure that only reproduces in a production build — hence this static check rather than a
 * runtime one). It also bloated first-load JS for pages that only needed a status enum.
 *
 * The fix deletes the `@/src/features/payout-disbursement` barrel (which re-exported the Safe-
 * importing modules) and makes `utilities/safe.ts` import the SDK lazily. This test walks the
 * STATIC import graph of each public route entrypoint and fails if it ever reaches the Safe SDK
 * or the deleted barrel — turning the bug class into a permanent, executable boundary.
 */

const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PUBLIC_ROUTE_ENTRYPOINTS = [
  "app/community/[communityId]/(with-header)/updates/page.tsx",
  "app/community/[communityId]/(with-header)/financials/page.tsx",
];

const FORBIDDEN_MODULE_SUBSTRINGS = ["@safe-global/"];
const FORBIDDEN_LOCAL_FILES = ["utilities/safe.ts"];
const DELETED_BARREL_IMPORT = '"@/src/features/payout-disbursement"';

const RESOLVABLE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

// Matches static `import ... from "X"` and `export ... from "X"` specifiers. Dynamic
// `import("X")` is intentionally ignored: lazy imports are exactly how the Safe SDK is now
// loaded, and they create their own chunk, so they do not participate in the route's static
// initialization graph that caused the crash.
const STATIC_SPECIFIER_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/g;

function extractStaticSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(STATIC_SPECIFIER_RE)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

/** Resolve a `@/`-aliased or relative specifier to an on-disk source file, if it is local. */
function resolveLocalModule(specifier: string, fromFile: string): string | null {
  let basePath: string;
  if (specifier.startsWith("@/")) {
    basePath = path.join(REPO_ROOT, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    basePath = path.resolve(path.dirname(fromFile), specifier);
  } else {
    // bare package specifier — not a local file
    return null;
  }

  for (const ext of RESOLVABLE_EXTENSIONS) {
    const candidate = `${basePath}${ext}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  if (existsSync(basePath) && statSync(basePath).isDirectory()) {
    for (const ext of RESOLVABLE_EXTENSIONS) {
      const indexCandidate = path.join(basePath, `index${ext}`);
      if (existsSync(indexCandidate)) return indexCandidate;
    }
  }
  if (existsSync(basePath) && statSync(basePath).isFile()) return basePath;
  return null;
}

interface GraphReport {
  reachedForbiddenPackages: string[];
  reachedForbiddenLocalFiles: string[];
  importsDeletedBarrel: string[];
}

function crawlStaticGraph(entryRelative: string): GraphReport {
  const entryAbs = path.join(REPO_ROOT, entryRelative);
  const visited = new Set<string>();
  const queue: string[] = [entryAbs];
  const report: GraphReport = {
    reachedForbiddenPackages: [],
    reachedForbiddenLocalFiles: [],
    importsDeletedBarrel: [],
  };

  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (visited.has(file)) continue;
    visited.add(file);
    if (!existsSync(file)) continue;

    const source = readFileSync(file, "utf8");
    const relFile = path.relative(REPO_ROOT, file);

    if (source.includes(DELETED_BARREL_IMPORT)) {
      report.importsDeletedBarrel.push(relFile);
    }

    for (const specifier of extractStaticSpecifiers(source)) {
      for (const forbidden of FORBIDDEN_MODULE_SUBSTRINGS) {
        if (specifier.includes(forbidden)) {
          report.reachedForbiddenPackages.push(`${relFile} -> ${specifier}`);
        }
      }

      const resolved = resolveLocalModule(specifier, file);
      if (!resolved) continue;

      const resolvedRel = path.relative(REPO_ROOT, resolved).split(path.sep).join("/");
      if (FORBIDDEN_LOCAL_FILES.includes(resolvedRel)) {
        report.reachedForbiddenLocalFiles.push(`${relFile} -> ${resolvedRel}`);
      }

      queue.push(resolved);
    }
  }

  return report;
}

/** Recursively collect every source file under a directory. */
function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, acc);
    } else if (RESOLVABLE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      acc.push(full);
    }
  }
  return acc;
}

describe("public community routes do not bundle the Safe SDK", () => {
  it("entrypoints exist on disk", () => {
    for (const entry of PUBLIC_ROUTE_ENTRYPOINTS) {
      expect(existsSync(path.join(REPO_ROOT, entry)), `${entry} should exist`).toBe(true);
    }
  });

  for (const entry of PUBLIC_ROUTE_ENTRYPOINTS) {
    it(`static graph of ${entry} never reaches @safe-global/* or utilities/safe.ts`, () => {
      const report = crawlStaticGraph(entry);
      expect(report.reachedForbiddenPackages).toEqual([]);
      expect(report.reachedForbiddenLocalFiles).toEqual([]);
      expect(report.importsDeletedBarrel).toEqual([]);
    });
  }
});

describe("the deleted payout-disbursement barrel is no longer imported anywhere", () => {
  it("no source file imports @/src/features/payout-disbursement", () => {
    const dirsToScan = ["app", "components", "hooks", "utilities", "src", "__tests__"];
    // Matches `from "@/src/features/payout-disbursement"`, `import("...")` and
    // `vi.mock("...")` against the deleted barrel — not arbitrary mentions of the string
    // (this guardrail file names the path in its own assertions).
    const barrelReferenceRe =
      /(?:from\s+|import\s*\(\s*|vi\.(?:mock|importActual|doMock)\s*\(\s*|importOriginal[^)]*)["']@\/src\/features\/payout-disbursement["']/;
    const thisFile = path.resolve(__filename);
    const offenders: string[] = [];

    for (const dir of dirsToScan) {
      const abs = path.join(REPO_ROOT, dir);
      if (!existsSync(abs)) continue;
      for (const file of collectSourceFiles(abs)) {
        if (path.resolve(file) === thisFile) continue;
        const source = readFileSync(file, "utf8");
        if (barrelReferenceRe.test(source)) {
          offenders.push(path.relative(REPO_ROOT, file));
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("the barrel file itself no longer exists", () => {
    expect(existsSync(path.join(REPO_ROOT, "src/features/payout-disbursement/index.ts"))).toBe(
      false
    );
  });
});
