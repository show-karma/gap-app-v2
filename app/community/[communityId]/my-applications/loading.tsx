export default function Loading() {
  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <div className="mb-2 h-9 w-48 animate-pulse rounded bg-muted" />
        <div className="h-5 w-80 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {["s1", "s2", "s3"].map((key) => (
            <div
              key={key}
              className="animate-pulse rounded-xl border border-border p-4 text-center"
            >
              <div className="mx-auto mb-2 h-9 w-12 rounded bg-muted" />
              <div className="mx-auto h-4 w-24 rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 w-48 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {["c1", "c2", "c3", "c4", "c5", "c6"].map((key) => (
            <div
              key={key}
              className="min-h-[200px] animate-pulse rounded-xl border border-border bg-card p-5"
            >
              <div className="space-y-3">
                <div className="h-5 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </div>
              <div className="mt-6 h-6 w-24 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
