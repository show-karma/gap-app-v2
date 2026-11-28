import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  isFallbackShellKey,
  type ShellCache,
  type ShellCacheEntry,
  withShellFallback,
} from "../../../cloudflare/shell-fallback-cache";
import { isFallbackShellPath, shipFallbackShells } from "../../../scripts/ship-fallback-shells.mjs";

// A fallback shell missing from R2 makes Next render it at request time, which
// fails with a 500 on every dynamic route (cloudflare/shell-fallback-cache.ts).

const HASH = "4dc9f029bbbe0abe4cbc1cb47826e09fd9a722fab0db5ec4b01a8cd58e01ae99";
const SHELL_KEY = `/route-cache/APP_PAGE/${HASH}/$/t/[tenant]/project/[projectId]`;
const PAGE_KEY = `/route-cache/APP_PAGE/${HASH}/$/t/karma/project/gitcoin`;

function cacheOf(entries: Record<string, ShellCacheEntry>) {
  const get = vi.fn(async (key: string) => entries[key] ?? null);
  const set = vi.fn(async (_key: string) => {});
  return { name: "test", get, set } satisfies ShellCache & { set: unknown };
}

describe("isFallbackShellKey", () => {
  it.each([
    SHELL_KEY,
    `/route-cache/APP_PAGE/${HASH}/$/t/karma/project/[projectId]`,
    `/route-cache/APP_PAGE/${HASH}/$/t/karma/project/[projectId]/about`,
    `/route-cache/APP_PAGE/${HASH}/$/t/[tenant]/projects`,
  ])("is true for the shell %s", (key) => {
    expect(isFallbackShellKey(key)).toBe(true);
  });

  it.each([
    PAGE_KEY,
    `/route-cache/APP_PAGE/${HASH}/$/blog`,
    "fetch-cache-key-[x]",
    `/route-cache/APP_PAGE/${HASH}/$/search?q=[x]y`,
  ])("is false for %s", (key) => {
    expect(isFallbackShellKey(key)).toBe(false);
  });
});

describe("withShellFallback", () => {
  const shipped = { value: { kind: "APP_PAGE", html: "" }, lastModified: 1 };

  it("returns what the store has without reading the fallback", async () => {
    const stored = { value: { kind: "APP_PAGE", html: "<p>r2</p>" }, lastModified: 2 };
    const store = cacheOf({ [SHELL_KEY]: stored });
    const fallback = cacheOf({ [SHELL_KEY]: shipped });

    await expect(withShellFallback(store, fallback).get(SHELL_KEY, "cache")).resolves.toBe(stored);
    expect(fallback.get).not.toHaveBeenCalled();
  });

  it("reads a shell the store does not have from the fallback", async () => {
    const fallback = cacheOf({ [SHELL_KEY]: shipped });
    const cache = withShellFallback(cacheOf({}), fallback);

    await expect(cache.get(SHELL_KEY, "cache")).resolves.toBe(shipped);
    await expect(cache.get(SHELL_KEY)).resolves.toBe(shipped);
  });

  it("leaves a page miss to the store, so Next renders the page", async () => {
    const fallback = cacheOf({ [PAGE_KEY]: shipped });

    await expect(withShellFallback(cacheOf({}), fallback).get(PAGE_KEY, "cache")).resolves.toBe(
      null
    );
    expect(fallback.get).not.toHaveBeenCalled();
  });

  it("never reads fetch or 'use cache' entries from the fallback", async () => {
    const fallback = cacheOf({ [SHELL_KEY]: shipped });
    const cache = withShellFallback(cacheOf({}), fallback);

    await expect(cache.get(SHELL_KEY, "fetch")).resolves.toBe(null);
    await expect(cache.get(SHELL_KEY, "composable")).resolves.toBe(null);
    expect(fallback.get).not.toHaveBeenCalled();
  });

  it("keeps the store's miss when the fallback has nothing either", async () => {
    await expect(withShellFallback(cacheOf({}), cacheOf({})).get(SHELL_KEY, "cache")).resolves.toBe(
      null
    );
  });

  it("writes to the store only", async () => {
    const store = cacheOf({});
    const fallback = cacheOf({});
    await withShellFallback(store, fallback).set(SHELL_KEY);

    expect(store.set).toHaveBeenCalledWith(SHELL_KEY);
    expect(fallback.set).not.toHaveBeenCalled();
  });
});

describe("shipFallbackShells", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "shells-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function write(relative: string, content: string) {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }

  it("selects the route cache entries whose path keeps a [param] segment", () => {
    const base = `route-cache/APP_PAGE/${HASH}/$`;
    expect(isFallbackShellPath(`${base}/t/[tenant]/project/[projectId].cache`)).toBe(true);
    expect(isFallbackShellPath(`${base}/t/karma/project/[projectId]/about.cache`)).toBe(true);
    expect(isFallbackShellPath(`${base}/t/karma/project/gitcoin.cache`)).toBe(false);
    expect(isFallbackShellPath(`__fetch/${HASH}`)).toBe(false);
  });

  it("copies the shells to the path the static-assets cache reads and nothing else", () => {
    const base = `cache/b1/route-cache/APP_PAGE/${HASH}/$/t`;
    write(`${base}/[tenant]/project/[projectId].cache`, '{"shell":1}');
    write(`${base}/karma/project/gitcoin.cache`, '{"page":1}');
    write("assets/cdn-cgi/_next_cache/b0/stale.cache", "{}");

    const result = shipFallbackShells({
      cacheRoot: path.join(root, "cache"),
      assetsRoot: path.join(root, "assets"),
      buildId: "b1",
    });

    expect(result.count).toBe(1);
    const shipped = path.join(
      root,
      `assets/cdn-cgi/_next_cache/b1/route-cache/APP_PAGE/${HASH}/$/t/[tenant]/project/[projectId].cache`
    );
    expect(readFileSync(shipped, "utf8")).toBe('{"shell":1}');
    expect(() =>
      readFileSync(path.join(root, "assets/cdn-cgi/_next_cache/b0/stale.cache"))
    ).toThrow();
  });
});
