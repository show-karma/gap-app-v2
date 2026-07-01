interface ReportGeneratingProps {
  // Shown as "Scoring {orgName}…" when we happen to know it (the detail
  // envelope carries it); otherwise a generic heading. We deliberately do NOT
  // show per-phase progress: the public slug endpoint 404s until the scan is
  // fully scored, so all we truthfully know is generating-vs-done.
  readonly orgName?: string | null;
}

export function ReportGenerating({ orgName }: ReportGeneratingProps) {
  return (
    <output
      aria-busy="true"
      aria-label="Generating report"
      className="flex flex-col gap-5 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          Generating report
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {orgName ? `Scoring ${orgName}…` : "Generating your report…"}
        </h2>
        <p className="max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
          We&rsquo;re checking whether AI agents acting for donors can reach, understand, trust, and
          transact with this site. This usually takes under a minute — the page updates on its own,
          no need to refresh.
        </p>
      </div>

      {/* Indeterminate: we know the scan is in progress, not how far along, so
          the bar pulses rather than implying a percentage. */}
      <div
        className="h-1.5 w-full animate-pulse rounded-full bg-blue-100 dark:bg-blue-900/40"
        aria-hidden
      />
    </output>
  );
}
