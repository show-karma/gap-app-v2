/**
 * The identity hint: who the app believes you are, published to the tenant's
 * marketing site.
 *
 * filpgf.io is a static site on its own origin, so it cannot see this app's
 * session — a signed-in visitor still met a "Sign in" button there. The two
 * hosts are siblings under one registrable domain, so a cookie set here on the
 * parent domain is readable by script on both. That is the whole mechanism.
 *
 * WHAT THIS IS NOT. It is not a credential, and nothing may be granted on the
 * strength of it. It carries a display name and an avatar URL, no token, and it
 * is deliberately readable by any script on the domain — so treating it as
 * proof of anything would be handing that decision to whatever wrote the
 * cookie. It exists so a marketing page can render a name instead of asking
 * someone to sign in twice. Every control it decorates navigates back into the
 * app, which re-derives auth from Privy and decides for real.
 *
 * It follows that the hint may be WRONG: sign out in another tab, an expired
 * session, a cleared store. The cost of that is one stale-looking button until
 * the next navigation, which is why it is only allowed to affect appearance.
 */

/** Cookie name. Shared contract with the marketing site — change both ends. */
export const IDENTITY_HINT_COOKIE = "karma_identity_hint";

/** A week: long enough to outlive a browsing session, short enough to lapse. */
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** Cookies ignore ports, so localhost:3005 and localhost:4342 already share a
 *  jar — the domain attribute is what has to be left off for that to work. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

interface IdentityHint {
  /** Schema version, so the reader can ignore a shape it does not know. */
  v: 1;
  /** Display name: whatever the navbar itself would show. */
  name: string;
  /** Avatar URL — a Farcaster picture or a resolved ENS avatar. */
  avatar?: string;
  /**
   * Wallet address, carried ONLY when no avatar URL resolved, and only so the
   * reader can draw the same `blo` identicon the app falls back to. The
   * identicon itself is a ~1KB data URI, too big to put in a cookie; the
   * address is 42 characters and regenerates it exactly.
   */
  address?: string;
}

/**
 * Whether `hostname` may carry a cookie scoped to `domain`.
 *
 * The browser enforces this too — a host cannot set a cookie for a domain it
 * does not belong to — but silently, by dropping the write. Checking first is
 * what keeps a tenant serving several domains (filecoin also serves
 * grants.filecoin.io) from quietly attempting a write that can never land.
 */
export function canWriteHint(hostname: string, domain: string | undefined): boolean {
  if (!domain) return false;
  if (LOCAL_HOSTS.has(hostname)) return true;
  const bare = domain.startsWith(".") ? domain.slice(1) : domain;
  return hostname === bare || hostname.endsWith(`.${bare}`);
}

function cookieAttributes(hostname: string, domain: string): string {
  // No Domain on localhost: it is not a registrable domain, and browsers reject
  // the attribute there. Omitting it scopes the cookie to the host, which is
  // exactly the sharing wanted in dev.
  const scope = LOCAL_HOSTS.has(hostname) ? "" : `; domain=${domain}`;
  // Secure everywhere it can be — dev is plain http on localhost, where the
  // attribute would make the cookie unwritable.
  const secure = LOCAL_HOSTS.has(hostname) ? "" : "; secure";
  // Lax, not None: both hosts are same-site, so nothing here is cross-site, and
  // None would widen it to every third-party context for no gain.
  return `; path=/${scope}; samesite=lax${secure}`;
}

/** Write the hint. No-op when the host cannot carry the tenant's cookie. */
export function writeIdentityHint(hint: IdentityHint, domain: string | undefined): void {
  if (typeof document === "undefined") return;
  const { hostname } = window.location;
  if (!canWriteHint(hostname, domain) || !domain) return;

  const value = encodeURIComponent(JSON.stringify(hint));
  // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is Chromium-only; this has to work in Safari and Firefox too.
  document.cookie = `${IDENTITY_HINT_COOKIE}=${value}${cookieAttributes(hostname, domain)}; max-age=${MAX_AGE_SECONDS}`;
}

/**
 * Clear the hint.
 *
 * Runs on sign-out, and on every load where the app finds itself signed out —
 * a hint that outlives the session is the failure mode worth designing against,
 * so the app clears it whenever it can see that it is stale.
 */
export function clearIdentityHint(domain: string | undefined): void {
  if (typeof document === "undefined") return;
  const { hostname } = window.location;
  if (!canWriteHint(hostname, domain) || !domain) return;

  // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is Chromium-only; this has to work in Safari and Firefox too.
  document.cookie = `${IDENTITY_HINT_COOKIE}=${cookieAttributes(hostname, domain)}; max-age=0`;
}
