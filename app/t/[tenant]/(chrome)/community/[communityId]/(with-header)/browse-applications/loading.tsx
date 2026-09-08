export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="mx-auto h-6 w-96 animate-pulse rounded bg-muted" />
      </div>
      <div className="mb-6 animate-pulse rounded-xl border border-border p-5">
        <div className="flex gap-4">
          <div className="h-12 w-80 rounded-lg bg-muted" />
          <div className="h-12 flex-1 rounded-lg bg-muted" />
          <div className="h-12 w-52 rounded-lg bg-muted" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {["l1", "l2", "l3", "l4", "l5", "l6"].map((key) => (
          <div
            key={key}
            className="min-h-[220px] animate-pulse rounded-xl border border-border bg-card p-5"
          >
            <div className="space-y-3">
              <div className="h-5 w-4/5 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
            <div className="mt-6 h-6 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
