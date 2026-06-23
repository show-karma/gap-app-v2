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
 * hashes. A `sessionStorage` flag guards against an infinite reload loop when
 * the chunk is genuinely unreachable (offline, hard 404) — after one attempt
 * we fall back to the normal error UI.
 */

// Webpack throws an Error whose `.name` is exactly "ChunkLoadError". Turbopack
// (`next build --turbopack`, used in production here) instead throws a plain
// Error whose message matches "Failed to load chunk …". Match both, plus the
// older webpack wording "Loading chunk … failed", so the predicate is robust
// across bundlers and Next versions.
const CHUNK_ERROR_MESSAGE = /Loading chunk [\w-]+ failed|Failed to load chunk/i;

const RELOAD_FLAG_KEY = "chunk-reload-attempted";

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
 * Attempt a one-time hard reload to recover from a stale-deploy chunk error.
 *
 * Returns `true` when a reload was triggered (the caller should render a
 * minimal "updating…" state while the navigation happens) and `false` when a
 * reload was already attempted in this session — in which case the caller
 * should render the normal error UI instead of looping. SSR-safe: returns
 * `false` when `window`/`sessionStorage` are unavailable.
 */
export function attemptChunkReload(): boolean {
  if (typeof window === "undefined") return false;

  let alreadyAttempted = false;
  try {
    alreadyAttempted = window.sessionStorage.getItem(RELOAD_FLAG_KEY) === "true";
  } catch {
    // sessionStorage can throw (privacy mode, disabled storage). Treat an
    // unreadable flag as "not yet attempted" so recovery still runs once;
    // if the write below also fails we simply won't loop because reload is
    // only triggered from a single error-boundary mount.
  }

  if (alreadyAttempted) return false;

  try {
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, "true");
  } catch {
    // Ignore: a failed write just means we can't guard a second attempt, but
    // the page is otherwise broken anyway and a single reload is the best we
    // can do.
  }

  window.location.reload();
  return true;
}

/**
 * Clear the reload guard after a successful mount so a *future* deploy can
 * trigger recovery again. Call this from a top-level client component's mount
 * effect. SSR-safe.
 */
export function clearChunkReloadFlag(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RELOAD_FLAG_KEY);
  } catch {
    // Ignore — nothing to clear if storage is unavailable.
  }
}
