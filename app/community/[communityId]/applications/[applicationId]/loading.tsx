export default function Loading() {
  return (
    <div className="container space-y-6 px-4 py-8">
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="animate-pulse rounded-xl border border-border p-6">
        <div className="space-y-3">
          <div className="h-8 w-2/3 rounded bg-muted" />
          <div className="h-5 w-1/3 rounded bg-muted" />
        </div>
      </div>
      <div className="animate-pulse rounded-xl border border-border p-6">
        <div className="grid grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="h-4 w-16 rounded bg-muted" />
            <div className="h-6 w-24 rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-6 w-32 rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-6 w-28 rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 rounded bg-muted" />
            <div className="h-6 w-28 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="animate-pulse rounded-xl border border-border p-6">
        <div className="space-y-4">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
