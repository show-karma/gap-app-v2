export default function SearchResultsLoading() {
  return (
    <main className="flex w-full min-h-[60vh] flex-col gap-6 px-4 py-16 max-w-4xl mx-auto">
      <div className="h-8 w-2/3 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
      <div className="mt-4 flex flex-col gap-4">
        {["s1", "s2", "s3", "s4", "s5"].map((id) => (
          <div
            key={id}
            className="h-24 w-full animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    </main>
  );
}
