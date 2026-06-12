import * as Sentry from "@sentry/nextjs";

interface CanonicalMismatchReport {
  scope: "project" | "community";
  /** The slug or uid from the route params. */
  requestedId: string;
  /** The canonical slug of the entity the loader actually resolved. */
  resolvedSlug: string | undefined;
  /** The uid of the resolved entity, for cross-referencing in Sentry. */
  resolvedUid: string | undefined;
}

// EAS attestation uid (project/community uids look like this in the URL).
const UID_PATTERN = /^0x[0-9a-fA-F]{64}$/;

/**
 * Tripwire for the intermittent cross-request SSR render bleed, where one
 * request's resolved entity has surfaced in another request's metadata under
 * concurrency.
 *
 * In normal flow a route's resolved canonical slug always equals its id param —
 * the project loader (`getProjectCachedData`) even redirects to the canonical
 * slug before returning — so reaching `generateMetadata` with a slug that does
 * not match the requested id is a state that should be impossible. When it
 * happens we capture the requested-vs-resolved identity so a recurrence leaves
 * a real, timestamped reproduction in Sentry instead of a one-off anecdote.
 *
 * This is a no-op for the common cases (id is a uid, slug missing, or slug
 * matches), so it adds no Sentry noise during normal operation. It cannot catch
 * a fully self-consistent params swap (where the whole render is mis-associated)
 * — only an inconsistency between the resolved entity and the route param.
 */
export function reportCanonicalMismatchIfAny(report: CanonicalMismatchReport): void {
  const { scope, requestedId, resolvedSlug, resolvedUid } = report;

  if (UID_PATTERN.test(requestedId)) return;
  if (!resolvedSlug) return;
  if (resolvedSlug.toLowerCase() === requestedId.toLowerCase()) return;

  Sentry.captureMessage(`canonical-mismatch:${scope}`, {
    level: "error",
    tags: { kind: "canonical-mismatch", scope },
    extra: { requestedId, resolvedSlug, resolvedUid },
  });
}
