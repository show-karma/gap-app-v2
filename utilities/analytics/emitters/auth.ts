/**
 * Authentication analytics emitters.
 *
 * `useAuth` mounts at ~100 call sites and is already the largest hook in the
 * app; the entry-point resolution below is about the EVENT, not about signing
 * in, so it lives here rather than adding a second job to that file.
 */

import { track } from "@/utilities/analytics/client";
import {
  ENTRY_POINT_SURFACES,
  type EntryPoint,
  type EntryPointSurface,
  ROUTE_ENTRY_POINT_PREFIX,
} from "@/utilities/analytics/events";
import { toPageGroup } from "@/utilities/analytics/route-pattern";

/**
 * `adaptedLogin` is handed straight to `onClick` at many call sites, which
 * would pass a MouseEvent as the first argument. Only a real surface id is
 * accepted; anything else falls back to the route family.
 */
const isEntryPoint = (value: unknown): value is EntryPoint =>
  typeof value === "string" &&
  (ENTRY_POINT_SURFACES.includes(value as EntryPointSurface) ||
    value.startsWith(ROUTE_ENTRY_POINT_PREFIX));

/**
 * How long a pre-`ready` start suppresses the retry that follows it.
 *
 * Long enough to cover the SDK's deferred load (an idle callback with a 5s
 * timeout) plus a person noticing nothing happened and clicking again. Short
 * enough that a click a minute later is treated as a new intent rather than
 * silently swallowed — the failure this bounds is under-counting, which is the
 * bug being fixed, so it errs towards emitting.
 */
const PRE_READY_START_TTL_MS = 60_000;

/**
 * When the pre-`ready` branch last opened the funnel on this page load, or
 * `null` if it has not, or the mark has been consumed or cleared.
 *
 * Module-level rather than context for the same reason as the logout record:
 * it is written from a callback that runs outside React's render, and read by
 * the next invocation of that same callback.
 */
let preReadyStartAt: number | null = null;

const livePreReadyStart = (): boolean =>
  preReadyStartAt !== null && Date.now() - preReadyStartAt < PRE_READY_START_TTL_MS;

/**
 * Opens the activation funnel, naming the surface the user clicked from.
 *
 * `entryPoint` is typed `unknown` and guarded rather than typed `string`
 * because of the `onClick` call sites above. Callers that do not name their
 * surface fall back to the route family — bounded, and carrying no identifiers,
 * unlike a raw pathname.
 *
 * `beforePrivyReady` says the caller emitted from the pre-`ready` branch, and
 * exists to stop ONE funnel opening being reported twice. Before the SDK loads
 * the bridge's `login` is a noop and nothing replays the click, so the visitor
 * sees nothing happen and clicks again once Privy is ready — two clicks, one
 * intent. The first is recorded here and the retry is dropped.
 *
 * The mark is cleared when it suppresses a retry, so a later click — a modal
 * dismissed, a genuine second attempt — opens the funnel again.
 */
export function emitLoginStarted(
  entryPoint: unknown,
  pathname: string,
  { beforePrivyReady = false }: { beforePrivyReady?: boolean } = {}
): void {
  if (beforePrivyReady) {
    preReadyStartAt = Date.now();
  } else if (livePreReadyStart()) {
    preReadyStartAt = null;
    return;
  }

  track("login_started", {
    entry_point: isEntryPoint(entryPoint)
      ? entryPoint
      : (`${ROUTE_ENTRY_POINT_PREFIX}${toPageGroup(pathname)}` as EntryPoint),
  });
}

/**
 * Forgets any pre-`ready` start, because the funnel it opened has closed.
 *
 * Called when a login completes: the next `login_started` is then a new
 * activation rather than the retry of that one. A logout needs no such call —
 * reaching one means a login completed first, which already cleared the mark.
 */
export function clearPreReadyLoginStart(): void {
  preReadyStartAt = null;
}
