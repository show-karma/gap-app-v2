import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * NOTHING REACHABLE FROM THE PAGE RENDERER MAY BE SERVER-ONLY, OR BE VEGA.
 *
 * `NotebookOverview.tsx` renders on the server for a reader, and inside the
 * BUILDER's preview, which is a client component. So every module it can reach
 * is a module the client bundle can be asked to contain. Two things must
 * therefore never appear in that closure: `import "server-only"`, which turns
 * the whole build into an error the moment the builder imports it, and vega,
 * which is ~700 kB of charting library that this feature exists specifically
 * to keep on the server. Both mistakes are one careless import away, and both
 * are invisible in review — the page still renders in a unit test either way.
 *
 * HOW IT WORKS. It walks the import graph itself: it resolves `@/` through the
 * SAME alias table vitest uses (`vitest.config.ts:33-36`), follows relative
 * specifiers, follows `export … from` re-exports, and treats a literal
 * `import("x")` as a static import — because for Next's file tracer that is
 * exactly what it is. TypeScript's erased forms are skipped: `import type`,
 * `export type`, `typeof import("x")` and `import("x").Member` are annotations
 * that no bundler ever sees.
 *
 * TWO LIMITS, STATED SO NOBODY OVER-TRUSTS THIS.
 *
 *   1. It does not resolve package subpaths. A bare specifier is recorded and
 *      not followed, so a package that itself pulls in vega would pass here.
 *   2. It proves NOTHING about Next's own client/server partitioning. It reads
 *      source text; Next decides the actual boundary from `"use client"`,
 *      server-component rules and its module graph. `pnpm run build` is the
 *      REAL gate — this test is the fast one that fails in the editor instead
 *      of six minutes into CI.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(dirname, "../../..");
const ENTRY = "components/Pages/Communities/Notebooks/NotebookOverview.tsx";

/** Mirrors `vitest.config.ts:33-36`, which mirrors tsconfig's `paths`. */
const ALIASES: Array<{ find: RegExp; replacement: string }> = [
  { find: /^@\/features\/(.*)$/, replacement: "src/features/$1" },
  { find: /^@\/src\/(.*)$/, replacement: "src/$1" },
  { find: /^@\/(.*)$/, replacement: "$1" },
];

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /(^|[^:])\/\/[^\n]*/g;
const TYPE_ONLY_STATEMENT = /\b(?:import|export)\s+type\s[\s\S]*?from\s*["'][^"']*["']/g;
const FROM_SPECIFIER = /\bfrom\s*["']([^"']+)["']/g;
const BARE_IMPORT = /\bimport\s*["']([^"']+)["']/g;
const DYNAMIC_IMPORT = /(typeof\s+)?\bimport\s*\(\s*["']([^"']+)["']\s*\)(\s*\.)?/g;

/**
 * Source with everything a bundler never sees removed.
 *
 * Comments go first so that a specifier NAMED IN PROSE — and this feature's
 * files discuss `server-only` and vega at length — is not mistaken for an
 * import. Type-only statements go next, because they are erased: the renderer
 * legitimately imports the TYPE of a server-only service, and following that
 * edge would fail this test over code that ships nothing.
 */
function strippedSource(file: string): string {
  return readFileSync(file, "utf8")
    .replaceAll(BLOCK_COMMENT, " ")
    .replaceAll(LINE_COMMENT, "$1 ")
    .replaceAll(TYPE_ONLY_STATEMENT, " ");
}

/** Every specifier the module actually imports a VALUE from. */
function specifiersOf(source: string): string[] {
  const specifiers: string[] = [];

  for (const match of source.matchAll(FROM_SPECIFIER)) specifiers.push(match[1]);
  for (const match of source.matchAll(BARE_IMPORT)) specifiers.push(match[1]);
  for (const match of source.matchAll(DYNAMIC_IMPORT)) {
    // `typeof import("x")` and `import("x").Member` are type positions.
    if (match[1] || match[3]) continue;
    specifiers.push(match[2]);
  }

  return specifiers;
}

/** An absolute path for a project-local specifier, or `null` for a package. */
function resolveLocal(specifier: string, fromFile: string): string | null {
  let candidate: string | null = null;

  if (specifier.startsWith(".")) {
    candidate = path.resolve(path.dirname(fromFile), specifier);
  } else {
    for (const alias of ALIASES) {
      if (!alias.find.test(specifier)) continue;
      candidate = path.join(ROOT, specifier.replace(alias.find, alias.replacement));
      break;
    }
  }

  if (!candidate) return null;

  for (const suffix of ["", ...EXTENSIONS]) {
    const file = `${candidate}${suffix}`;
    try {
      if (readFileSync(file) && !file.endsWith(path.sep)) return file;
    } catch {
      // Not a file at this extension; try the next.
    }
  }
  for (const extension of EXTENSIONS) {
    const file = path.join(candidate, `index${extension}`);
    try {
      readFileSync(file);
      return file;
    } catch {
      // Not a directory with an index either.
    }
  }

  // Unresolvable: a stylesheet, an asset, or a path this walker cannot see.
  // Recorded as nothing rather than guessed at.
  return null;
}

interface Closure {
  files: Set<string>;
  packages: Map<string, string[]>;
}

function closureFrom(entry: string): Closure {
  const files = new Set<string>();
  const packages = new Map<string, string[]>();
  const pending = [path.join(ROOT, entry)];

  while (pending.length > 0) {
    const file = pending.pop() as string;
    if (files.has(file)) continue;
    files.add(file);

    for (const specifier of specifiersOf(strippedSource(file))) {
      const resolved = resolveLocal(specifier, file);
      if (resolved) {
        if (!files.has(resolved)) pending.push(resolved);
        continue;
      }
      const importers = packages.get(specifier) ?? [];
      importers.push(path.relative(ROOT, file));
      packages.set(specifier, importers);
    }
  }

  return { files, packages };
}

const closure = closureFrom(ENTRY);
const localFiles = [...closure.files].map((file) => path.relative(ROOT, file)).sort();

describe("the notebook renderer's import closure", () => {
  // A walker that silently resolved nothing would pass every assertion below.
  // These are the tripwire: the closure has to contain the modules this
  // feature actually added, or the test is measuring an empty set.
  it("should_actually_have_walked_the_graph", () => {
    expect(localFiles).toContain("components/Pages/Communities/Notebooks/NotebookQueryChart.tsx");
    expect(localFiles).toContain("services/notebooks/notebook-chart-svg.ts");
    expect(localFiles).toContain("services/notebooks/notebook-page-data.types.ts");
    expect(localFiles.length).toBeGreaterThan(5);
  });

  // The marker exists so that this mistake is a BUILD failure rather than a
  // silent 700 kB. Catching it here just means finding out sooner.
  it("should_reach_no_module_marked_server_only", () => {
    const offenders = closure.packages.get("server-only") ?? [];

    expect(offenders).toEqual([]);
  });

  // The renderer receives a compiled string. If it could reach vega it would
  // not need to, and the whole server-side compile would be paid twice — once
  // on the server, once in every reader's bundle.
  it("should_reach_no_part_of_vega", () => {
    const offenders = [...closure.packages.entries()].filter(
      ([specifier]) => specifier === "vega" || specifier.startsWith("vega/")
    );

    expect(offenders).toEqual([]);
  });

  it("should_reach_no_part_of_vega_lite", () => {
    const offenders = [...closure.packages.entries()].filter(
      ([specifier]) => specifier === "vega-lite" || specifier.startsWith("vega-lite/")
    );

    expect(offenders).toEqual([]);
  });

  // The renderer is the only vega importer in the build, and it is server-only
  // for that reason. Naming it here says why it is absent above.
  it("should_not_reach_the_chart_renderer_itself", () => {
    expect(localFiles).not.toContain("services/notebooks/notebook-chart.render.ts");
    expect(localFiles).not.toContain("services/notebooks/notebook-page-data.ts");
  });
});
