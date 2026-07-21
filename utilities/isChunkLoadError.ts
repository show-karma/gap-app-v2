/**
 * Detection + one-time recovery for stale-deploy chunk failures.
 *
 * Context: Sentry issue GAP-FRONTEND-1XX ("Failed to load chunk
 * /_next/static/chunks/<hash>.js") ran at 63 events / 41 users — the highest
 * user-impacting frontend issue. It is the classic stale-deploy failure: a
 * user has the app open (or a cached document referencing an old build); we
 * deploy and Vercel rotates the content-hashed chunk filenames, purging the
 * old ones. The next lazy import / route transition requests a chunk URL that
 * no longer exists and the loader throws `ChunkLoadError`.
 *
 * The fix is to force a single full-document reload, which re-fetches the HTML
 * (short/no-cache) and with it the fresh build manifest pointing at the new
 * hashes. A `sessionStorage` flag (a timestamp, not a boolean — see
 * `RELOAD_TTL_MS`) guards against an infinite reload loop when the chunk is
 * genuinely unreachable (offline, hard 404) — after one attempt within the
 * TTL window we fall back to the normal error UI.
 *
 * GAP-FRONTEND-20T follow-up: the guard used to be cleared as soon as the
 * root layout mounted (`ChunkReloadResetter`), which is correct for the
 * render-path recovery in `ErrorBoundary`/`app/error.tsx` (a fresh mount
 * really does mean the new build's chunks loaded). But `chunkRecovery.ts`
 * also recovers `unhandledrejection`/`error` failures that never touch React
 * at all — those can fire from a background prefetch after the app has
 * already mounted successfully. Clearing the flag on mount would let a
 * persistently-broken chunk (ad-blocker/CSP) re-arm recovery on every retry
 * and reload endlessly. A time-boxed guard (below) survives past mount and
 * expires on its own, so `ChunkReloadResetter` was removed.
 */

// Webpack throws an Error whose `.name` is exactly "ChunkLoadError". Turbopack
// (`next build --turbopack`, used in production here) instead throws a plain
// Error whose message matches "Failed to load chunk …". Match both, plus the
// older webpack wording "Loading chunk … failed", so the predicate is robust
// across bundlers and Next versions.
const CHUNK_ERROR_MESSAGE = /Loading chunk [\w-]+ failed|Failed to load chunk/i;

const RELOAD_FLAG_KEY = "chunk-reload-attempted";

// A reload attempt "expires" after this window, so a chunk that fails again
// well after the reload (a later deploy, a different session) can trigger
// recovery again without needing a mount-time reset.
const RELOAD_TTL_MS = 60_000;

function getErrorName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return "";
}

function getErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

/**
 * True when the error is a stale-deploy chunk load failure. Matches the
 * webpack `ChunkLoadError` name and the Turbopack/webpack "Failed to load
 * chunk" / "Loading chunk … failed" message wording.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  if (getErrorName(error) === "ChunkLoadError") return true;
  return CHUNK_ERROR_MESSAGE.test(getErrorMessage(error));
}

/**
 * Reads the guard flag as a timestamp. Returns `null` when unset, unreadable
 * (storage throws), or holding a legacy non-numeric value (`"true"`, written
 * by tabs still running the pre-TTL build) — all three are treated as "not
 * attempted" so recovery still runs, at worst costing one extra reload.
 */
function readReloadTimestamp(): number | null {
  try {
    const raw = window.sessionStorage.getItem(RELOAD_FLAG_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    // sessionStorage can throw (privacy mode, disabled storage).
    return null;
  }
}

/**
 * True when a chunk-reload attempt was recorded within the last
 * `RELOAD_TTL_MS`. SSR-safe: returns `false` when `window` is unavailable.
 */
export function hasChunkReloadBeenAttempted(): boolean {
  if (typeof window === "undefined") return false;
  const timestamp = readReloadTimestamp();
  if (timestamp === null) return false;
  return Date.now() - timestamp < RELOAD_TTL_MS;
}

/**
 * Attempt a one-time (per `RELOAD_TTL_MS` window) hard reload to recover from
 * a stale-deploy chunk error.
 *
 * Returns `true` when a reload was triggered (the caller should render a
 * minimal "updating…" state while the navigation happens) and `false` when a
 * reload was already attempted within the TTL window — in which case the
 * caller should render the normal error UI instead of looping. SSR-safe:
 * returns `false` when `window`/`sessionStorage` are unavailable.
 */
export function attemptChunkReload(): boolean {
  if (typeof window === "undefined") return false;

  if (hasChunkReloadBeenAttempted()) return false;

  let storageUsable = true;
  try {
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));
  } catch {
    // Ignore: a failed write just means we can't guard a second attempt via
    // storage — fall through to the Navigation Timing belt-and-braces below.
    storageUsable = false;
  }

  if (!storageUsable) {
    // Storage is unusable, so the TTL guard above can never see a prior
    // attempt. Fall back to the Navigation Timing API: if this pageload is
    // itself already the result of a reload, we must have already tried
    // once and storage simply couldn't record it — refuse to loop.
    let isReloadNavigation = false;
    try {
      const [entry] = window.performance.getEntriesByType("navigation");
      isReloadNavigation = (entry as PerformanceNavigationTiming | undefined)?.type === "reload";
    } catch {
      // Navigation Timing API unavailable too — nothing left to check;
      // proceed with a single best-effort reload.
    }
    if (isReloadNavigation) return false;
  }

  window.location.reload();
  return true;
}
