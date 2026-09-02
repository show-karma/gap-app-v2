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
 * Opens the activation funnel, naming the surface the user clicked from.
 *
 * `entryPoint` is typed `unknown` and guarded rather than typed `string`
 * because of the `onClick` call sites above. Callers that do not name their
 * surface fall back to the route family — bounded, and carrying no identifiers,
 * unlike a raw pathname.
 */
export function emitLoginStarted(entryPoint: unknown, pathname: string): void {
  track("login_started", {
    entry_point: isEntryPoint(entryPoint)
      ? entryPoint
      : (`${ROUTE_ENTRY_POINT_PREFIX}${toPageGroup(pathname)}` as EntryPoint),
  });
}
