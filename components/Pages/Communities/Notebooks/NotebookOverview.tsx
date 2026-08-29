import type { NotebookBar, NotebookOverview } from "@/services/notebook-overview.service";

/**
 * The static-first notebook render (Architecture B).
 *
 * A server component with NO client JavaScript and no chart library: every
 * number and every bar is in the initial HTML. That is the whole point — the
 * page it replaces booted a ~9s Python runtime in the browser to draw the same
 * figures, and paid that cost per viewer.
 *
 * The bars are deliberately not a charting library. Each one encodes a single
 * magnitude against a shared scale, which a labelled `<div>` does exactly as
 * well as an SVG, in the initial paint, with no bundle. Every bar carries its
 * own value as text, so identity and magnitude are never colour-alone and the
 * markup reads as a list to a screen reader.
 */

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

function formatStat(value: number, format: "currency" | "count" | "percent"): string {
  if (format === "currency") return formatCurrency(value);
  if (format === "percent") return `${value.toFixed(1)}%`;
  return value.toLocaleString("en-US");
}

/** Clamped fill fraction — a bar can never overflow its track. */
function fillPercent(bar: NotebookBar): number {
  if (bar.total <= 0) return 0;
  return Math.max(0, Math.min(100, (bar.value / bar.total) * 100));
}

function BarRow({ bar }: { bar: NotebookBar }) {
  const percent = fillPercent(bar);

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex flex-row items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-foreground">{bar.label}</span>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{bar.caption}</span>
      </div>
      {/* aria-hidden: the value is already stated in the caption above, so the
          bar is decoration for a screen reader, not a second announcement. */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      {bar.meta ? <span className="text-xs text-muted-foreground">{bar.meta}</span> : null}
    </li>
  );
}

function BarSection({
  title,
  description,
  bars,
}: {
  title: string;
  description: string;
  bars: NotebookBar[];
}) {
  if (bars.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="flex flex-col gap-4">
        {bars.map((bar) => (
          <BarRow key={bar.label} bar={bar} />
        ))}
      </ul>
    </section>
  );
}

export function NotebookOverviewView({ overview }: { overview: NotebookOverview }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overview.stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-2xl border border-border bg-background p-5"
          >
            <span className="text-2xl font-semibold tabular-nums leading-none text-foreground">
              {formatStat(stat.value, stat.format)}
            </span>
            <span className="text-sm font-medium text-foreground">{stat.label}</span>
            {stat.hint ? <span className="text-xs text-muted-foreground">{stat.hint}</span> : null}
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarSection
          title="Disbursed against commitment"
          description="How much of each program's committed funding has actually been paid out. Bars share one scale, so program sizes are comparable."
          bars={overview.funding}
        />
        <BarSection
          title="Milestone completion by track"
          description="Average share of milestones completed across the projects in each track."
          bars={overview.completion}
        />
      </div>

      {overview.applications.length > 0 ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 md:p-6">
          <h2 className="text-base font-semibold text-foreground">Applications</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            {overview.applications.map((entry) => (
              <div key={entry.label} className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">{entry.label}</dt>
                <dd className="text-xl font-semibold tabular-nums text-foreground">
                  {entry.value.toLocaleString("en-US")}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
