export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <output
        aria-label="Loading connections"
        className="block h-8 w-48 animate-pulse rounded-md bg-muted"
      />
      <div className="space-y-3">
        <div className="h-20 w-full animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-20 w-full animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-20 w-full animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    </main>
  );
}
