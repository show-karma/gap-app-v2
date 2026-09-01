const ROWS = ["r1", "r2", "r3", "r4", "r5"];

export default function ScannerSiteLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <output
        className="flex animate-pulse flex-col gap-6"
        aria-busy="true"
        aria-label="Loading report"
      >
        <div className="flex flex-wrap items-center gap-6 rounded-3xl border border-border bg-card p-6">
          <div className="h-[152px] w-[152px] shrink-0 rounded-full bg-secondary" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-2/3 rounded bg-secondary" />
            <div className="h-4 w-full rounded bg-secondary" />
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          {ROWS.map((row) => (
            <div key={row} className="h-8 w-full rounded bg-secondary" />
          ))}
        </div>
      </output>
    </main>
  );
}
