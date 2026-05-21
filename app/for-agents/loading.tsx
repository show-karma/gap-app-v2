export default function Loading() {
  return (
    <main className="flex w-full flex-col items-center bg-background">
      <div className="flex w-full max-w-3xl flex-col gap-6 px-4 py-16">
        <output
          aria-label="Loading For AI Agents page"
          className="block h-12 w-3/4 animate-pulse rounded-md bg-muted"
        />
        <div className="h-32 w-full animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-64 w-full animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    </main>
  );
}
