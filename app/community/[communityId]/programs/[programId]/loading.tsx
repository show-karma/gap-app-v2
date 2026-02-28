export default function ProgramDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Back link skeleton */}
      <div className="mb-6 h-5 w-32 animate-pulse rounded bg-muted" />

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Main content skeleton */}
        <div className="flex-1 space-y-4">
          <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-10 w-3/4 animate-pulse rounded-lg bg-muted" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
          <div className="space-y-2 pt-4">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="h-80 w-full animate-pulse rounded-xl bg-muted lg:w-96" />
      </div>
    </div>
  );
}
