/**
 * Placeholder for the grant comments surface.
 *
 * Rendered while authorization is still tri-state and while the (heavy)
 * comment components are being code-split in. Kept in its own module so the
 * light wrapper can show it without pulling the markdown editor bundle.
 */
export function GrantCommentsSkeleton() {
  return (
    <output
      aria-label="Loading comments"
      data-testid="grant-comments-skeleton"
      className="block w-full animate-pulse space-y-3 rounded-2xl border border-border bg-card p-5"
    >
      <span className="block h-5 w-32 rounded bg-gray-200 dark:bg-zinc-700" />
      <span className="block h-4 w-full rounded bg-gray-100 dark:bg-zinc-800" />
      <span className="block h-4 w-3/4 rounded bg-gray-100 dark:bg-zinc-800" />
    </output>
  );
}
