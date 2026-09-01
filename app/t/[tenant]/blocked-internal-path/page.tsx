import { notFound } from "next/navigation";

/**
 * Where the proxy sends a public request that already carries the internal
 * `/t/<tenant>` prefix.
 *
 * It has to be a real route rather than an unmatchable path: an unmatched URL
 * is answered by the *root* not-found boundary, and since the page tree moved
 * under `app/t/[tenant]/` there is no root-level `app/not-found.tsx` any more —
 * Next falls back to its own built-in 404, which carries none of our chrome.
 * A route that lives under this layout and throws `notFound()` renders
 * `app/t/[tenant]/not-found.tsx` inside the normal shell, with a 404 status.
 *
 * Reaching it directly from the browser is fine: `/blocked-internal-path` is
 * rewritten here like any other page path and answers the same branded 404.
 */
export default function BlockedInternalPathPage(): never {
  notFound();
}
