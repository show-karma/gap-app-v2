export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <output
        aria-label="Loading MCP connection details"
        className="block h-12 w-3/4 animate-pulse rounded-md bg-muted"
      />
      <div className="h-32 w-full animate-pulse rounded-2xl border border-border bg-card" />
      <div className="h-64 w-full animate-pulse rounded-2xl border border-border bg-card" />
    </main>
  );
}
