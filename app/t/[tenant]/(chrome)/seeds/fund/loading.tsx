// Route-local loading state (DEV-612): the root app/loading.tsx was removed so
// sitemap-crawlable routes render into the visible shell, which orphaned this
// non-crawlable route's instant loading state. Restored locally; safe because
// no sitemap-listed route lives at or below this segment.
export default function Loading() {
  return (
    <main className="flex w-full min-h-[60vh] items-center justify-center bg-background">
      <output
        aria-label="Loading seed funding"
        aria-busy="true"
        className="block h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary"
      />
    </main>
  );
}
