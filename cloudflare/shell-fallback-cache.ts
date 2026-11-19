// Fallback shells that cannot go missing.
//
// With Cache Components every dynamic route has a fallback shell, the static
// part rendered with its params unknown: `/t/[tenant]/project/[projectId]`. When
// a page is not cached yet, Next serves that shell and streams the rest. If the
// shell is not in the cache either, Next renders it again at request time, and
// that render fails: the layouts read their params outside `<Suspense>`, which a
// shell cannot do, so the request ends in a 500 ("encountered uncached or
// runtime data during prerendering", NEXT_STATIC_GEN_BAILOUT). The build has no
// such problem, and `next start` fails the same way once the shell files are
// deleted from `.next`, so this is Next, not the Worker.
//
// On Vercel the build output is immutable and the shell is always there. Here
// the cache is R2, filled by a separate step after the build, so a shell can be
// absent: a deploy that skipped or failed that step, a new R2 prefix, an
// emptied bucket, or a read error, which the R2 cache reports as a miss.
//
// `scripts/ship-fallback-shells.mjs` copies the build's shells into the
// Worker's static assets (under `cdn-cgi/`, which only the Worker can read).
// This wrapper reads one from there when the store does not have it. Every
// other entry is left to the store: a page that misses is rendered normally,
// only a shell cannot be.
//
// The shell from the assets is the build's own, so it is what an R2 filled at
// deploy would hold. Once Next writes a newer shell (after a tag revalidation,
// say), the store has it and the copy is not read again.
//
// Kept free of adapter imports so it can be unit tested; open-next.config.ts
// passes in the R2 and static-assets caches.

export type ShellCacheType = "cache" | "fetch" | "composable";

export interface ShellCacheEntry {
  value?: unknown;
  lastModified?: number;
}

export interface ShellCache {
  name: string;
  get(key: string, cacheType?: ShellCacheType): Promise<ShellCacheEntry | null>;
}

/**
 * Whether a route cache key is a fallback shell: its path keeps at least one
 * `[param]` segment. A concrete page has its params filled in.
 *
 * Keys look like `/route-cache/APP_PAGE/<sha256 of the source route>/$/t/[tenant]/project/[projectId]`.
 */
export function isFallbackShellKey(key: string): boolean {
  const marker = key.indexOf("/$/");
  if (!key.startsWith("/route-cache/") || marker === -1) return false;
  return /\/\[[^/]+\](?=\/|$)/.test(key.slice(marker + 2));
}

/**
 * Wraps `store` so that a fallback shell it does not have is read from
 * `fallback`. Only route cache entries (`cacheType` "cache" or none) are
 * concerned; fetch and "use cache" entries are never shipped in the assets.
 */
export function withShellFallback<Store extends ShellCache>(
  store: Store,
  fallback: ShellCache
): Store {
  async function get(key: string, cacheType?: ShellCacheType): Promise<ShellCacheEntry | null> {
    const entry = await store.get(key, cacheType);
    if (entry?.value) return entry;
    if (cacheType === "fetch" || cacheType === "composable" || !isFallbackShellKey(key)) {
      return entry;
    }
    const shipped = await fallback.get(key, cacheType);
    return shipped?.value ? shipped : entry;
  }

  return new Proxy(store, {
    get(target, property, receiver) {
      if (property === "get") return get;
      if (property === "name") return `${target.name}+shell-fallback`;
      const value: unknown = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
