export default function SolutionLoading() {
  return (
    <div className="mx-auto max-w-[1120px] px-8 py-12">
      <div className="animate-pulse space-y-12">
        <div className="flex flex-col items-center gap-6">
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="h-12 w-[500px] max-w-full rounded bg-muted" />
          <div className="h-5 w-96 max-w-full rounded bg-muted" />
          <div className="h-10 w-48 rounded bg-muted" />
        </div>
        <div className="h-px w-full bg-muted" />
        <div className="space-y-4">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="h-32 w-full rounded-2xl bg-muted" />
        </div>
        <div className="h-px w-full bg-muted" />
        <div className="space-y-4">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={`skeleton-${i}`} className="h-24 rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
