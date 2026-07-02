const ROWS = ["r1", "r2", "r3"];

export default function ScannerApiKeysLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-12">
      <output
        className="flex animate-pulse flex-col gap-5"
        aria-busy="true"
        aria-label="Loading API keys"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-secondary" />
            <div className="h-4 w-64 rounded bg-secondary" />
          </div>
          <div className="h-9 w-28 rounded-md bg-secondary" />
        </div>
        {ROWS.map((row) => (
          <div
            key={row}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="h-10 w-10 rounded-xl bg-secondary" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-secondary" />
              <div className="h-3 w-1/2 rounded bg-secondary" />
            </div>
          </div>
        ))}
      </output>
    </main>
  );
}
