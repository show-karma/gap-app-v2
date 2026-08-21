/**
 * Who may frame the token bridge, and where it lives.
 *
 * The bridge (`/auth/token-bridge`) is the one route a tenant's marketing site
 * is allowed to frame. It exists because a Privy session is origin-scoped: the
 * static site on www.filpgf.io cannot see the session on app.filpgf.io, so it
 * frames this route — same site, so storage is not partitioned — and asks it
 * for an access token over postMessage. See `src/features/token-bridge/`.
 *
 * This module is imported by `next.config.ts` (to emit `frame-ancestors`) and
 * by the tenant config (so the bridge knows who it may answer). The two lists
 * must agree, which is why there is exactly one. Keep it to origins we operate:
 * every entry here is both a clickjacking surface and a party that can obtain a
 * signed-in visitor's token.
 *
 * No path aliases or app imports here — next.config.ts loads this before the
 * alias resolver exists.
 */

export const TOKEN_BRIDGE_PATH = "/auth/token-bridge";

/** Production origins, by tenant id. A tenant absent here has no bridge. */
export const TOKEN_BRIDGE_ORIGINS: Readonly<Partial<Record<string, readonly string[]>>> = {
  // The filpgf.io landing site. The apex 301s to www, but a visitor who lands
  // on the apex before the redirect is still a legitimate embedder.
  filecoin: ["https://filpgf.io", "https://www.filpgf.io"],
};

/**
 * Whether this build may also be framed by preview and local hosts.
 *
 * Deliberately opt-in rather than `NODE_ENV !== "production"`: Vercel builds
 * previews with NODE_ENV=production, so that test would quietly drop the extra
 * origins exactly where they are needed. Reading the environment explicitly
 * also fails safe — if the VERCEL_ENV variables go missing on a production
 * build, NODE_ENV is still "production" and nothing relaxes.
 *
 * `NEXT_PUBLIC_VERCEL_ENV` is what survives into the client bundle, which is
 * where the bridge itself checks origins; `VERCEL_ENV` is what next.config.ts
 * sees at build time. Both are read so the two agree.
 */
export function tokenBridgeAllowsPreviewOrigins(): boolean {
  return (
    process.env.VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
    process.env.NODE_ENV !== "production"
  );
}

/**
 * Preview and local embedders. Never present in a production build.
 *
 * The landing site deploys previews to Vercel under per-branch hostnames, so
 * they are matched by pattern rather than chased one at a time. The local
 * ports are Astro's default and the two the site has historically used.
 */
export const TOKEN_BRIDGE_PREVIEW_ORIGINS: readonly string[] = [
  "https://*.vercel.app",
  "http://localhost:4321",
  "http://localhost:4342",
  "http://localhost:4343",
];

/** Every origin a given tenant's bridge may answer in this build. */
export function tokenBridgeOriginsFor(tenantId: string | null | undefined): readonly string[] {
  const production = tenantId ? (TOKEN_BRIDGE_ORIGINS[tenantId] ?? []) : [];
  if (production.length === 0) return [];
  return tokenBridgeAllowsPreviewOrigins()
    ? [...production, ...TOKEN_BRIDGE_PREVIEW_ORIGINS]
    : production;
}

/** Every origin any tenant's bridge may answer — what `frame-ancestors` lists. */
export function allTokenBridgeOrigins(): readonly string[] {
  const production = Object.values(TOKEN_BRIDGE_ORIGINS).flatMap((origins) => origins ?? []);
  return tokenBridgeAllowsPreviewOrigins()
    ? [...production, ...TOKEN_BRIDGE_PREVIEW_ORIGINS]
    : production;
}

/**
 * Does `origin` (as `MessageEvent.origin` reports it) match one of `patterns`?
 *
 * A pattern is a literal origin, or one whose host starts with `*.` to accept
 * any single-or-multi-label subdomain. Scheme and port must match exactly;
 * there is no wildcard for either. Anything unparsable is refused.
 */
export function isAllowedBridgeOrigin(origin: string, patterns: readonly string[]): boolean {
  let candidate: URL;
  try {
    candidate = new URL(origin);
  } catch {
    return false;
  }
  // `new URL("https://a.b/path").origin` normalises what we compare against;
  // an origin string never carries a path, but a malformed one might.
  if (candidate.origin !== origin) return false;

  return patterns.some((pattern) => {
    let wanted: URL;
    try {
      wanted = new URL(pattern);
    } catch {
      return false;
    }
    if (wanted.protocol !== candidate.protocol || wanted.port !== candidate.port) return false;
    if (!wanted.hostname.startsWith("*.")) return wanted.hostname === candidate.hostname;
    const suffix = wanted.hostname.slice(1); // ".vercel.app"
    return candidate.hostname.endsWith(suffix) && candidate.hostname.length > suffix.length;
  });
}
