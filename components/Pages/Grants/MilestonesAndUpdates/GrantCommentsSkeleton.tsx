/**
 * Placeholder for the grant comments surface.
 *
 * Rendered while authorization is still tri-state and while the (heavy)
 * comment components are being code-split in. Kept in its own module so the
 * light wrapper can show it without pulling the markdown editor bundle — and
 * so `GrantCommentsSection` can reuse it without importing from its own
 * dynamic-import parent.
 *
 * Mirrors `CommentTimeline`'s shell — same radius, border and card surface,
 * same header band divided by a rule — so the swap from placeholder to real
 * thread does not shift the milestone list below it. Colours are theme tokens
 * rather than fixed greys: this page is whitelabelled, and a hard-coded grey
 * stops matching once a tenant recolours the surface.
 */
export function GrantCommentsSkeleton() {
  return (
    <output
      aria-label="Loading comments"
      data-testid="grant-comments-skeleton"
      className="block w-full animate-pulse rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <span className="block h-5 w-5 rounded bg-muted" />
        <div className="flex flex-col gap-1.5">
          <span className="block h-4 w-24 rounded bg-muted" />
          <span className="block h-3 w-40 rounded bg-muted/60" />
        </div>
      </div>
      <div className="space-y-3 px-5 py-4">
        <span className="block h-4 w-full rounded bg-muted/60" />
        <span className="block h-4 w-3/4 rounded bg-muted/60" />
      </div>
    </output>
  );
}
