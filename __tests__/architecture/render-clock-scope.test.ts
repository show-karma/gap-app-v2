import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The render clock (`useRenderNow()` / `useRenderedAt()`) is provided by the
 * community layout only. Outside that subtree there is no provider, and the
 * hooks fall back to `Date.now()` — which aborts a cacheComponents prerender
 * the moment it runs during render.
 *
 * It used to be provided by the root layout, which serialized a changing value
 * into every route: project pages then differed between any two regenerations
 * and were stored again (an ISR write) even when nothing had changed.
 *
 * This test walks the import graph upwards from every clock consumer and fails
 * if any route file outside the community subtree can reach one. Moving the
 * provider, or rendering a consumer somewhere new, has to update both.
 */

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SCANNED_DIRS = ["app", "components", "src", "hooks", "utilities", "store", "services"];
const IGNORED_DIRS = new Set(["node_modules", ".next", "__tests__", "__mocks__"]);
const EXTENSIONS = [".ts", ".tsx"];
const CLOCK_MODULE = path.join(REPO_ROOT, "utilities/render-clock-context.tsx");
const PROVIDER_SCOPE = path.join(REPO_ROOT, "app/t/[tenant]/(chrome)/community/[communityId]");
const ROOT_LAYOUT = path.join(REPO_ROOT, "app/t/[tenant]/layout.tsx");

function collect(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, out);
    else if (
      EXTENSIONS.includes(path.extname(entry.name)) &&
      !/\.(test|stories)\./.test(entry.name)
    )
      out.push(full);
  }
  return out;
}

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(REPO_ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

const IMPORT = /(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function buildImporters(files: string[]): Map<string, Set<string>> {
  const importers = new Map<string, Set<string>>();
  for (const file of files) {
    const source = readFileSync(file, "utf-8");
    for (const match of source.matchAll(IMPORT)) {
      const target = resolveImport(file, match[1] ?? match[2]);
      if (!target) continue;
      if (!importers.has(target)) importers.set(target, new Set());
      importers.get(target)?.add(file);
    }
  }
  return importers;
}

describe("render clock scope", () => {
  const files = SCANNED_DIRS.flatMap((dir) => collect(path.join(REPO_ROOT, dir)));
  const importers = buildImporters(files);

  it("is not read by the root layout", () => {
    const layout = readFileSync(ROOT_LAYOUT, "utf-8");
    expect(layout).not.toMatch(/from\s+["']@\/utilities\/render-clock-(context|server)["']/);
  });

  it("only reaches routes under the community layout, which provides it", () => {
    const consumers = [...(importers.get(CLOCK_MODULE) ?? [])];
    expect(consumers.length).toBeGreaterThan(0);

    const seen = new Set<string>();
    const queue = [...consumers];
    const routesReached = new Set<string>();
    while (queue.length > 0) {
      const file = queue.pop() as string;
      if (seen.has(file)) continue;
      seen.add(file);
      if (file.startsWith(path.join(REPO_ROOT, "app") + path.sep)) routesReached.add(file);
      for (const parent of importers.get(file) ?? []) queue.push(parent);
    }

    const outside = [...routesReached]
      .filter((file) => !file.startsWith(PROVIDER_SCOPE + path.sep))
      .map((file) => path.relative(REPO_ROOT, file));
    expect(outside).toEqual([]);
    expect(routesReached.size).toBeGreaterThan(0);
  });
});
