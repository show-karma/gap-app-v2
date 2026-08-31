import type {
  NotebookBar,
  NotebookOverview,
  NotebookStat,
} from "@/services/notebook-overview.service";
import type {
  NotebookBarsSection,
  NotebookKpisSection,
  NotebookSection,
  NotebookSpec,
  NotebookTextSection,
} from "@/services/notebooks/notebook-spec";

/**
 * The static-first notebook render (Architecture B), driven by a page spec.
 *
 * A server component with NO client JavaScript and no chart library: every
 * number and every bar is in the initial HTML. That is the whole point — the
 * page it replaces booted a ~9s Python runtime in the browser to draw the same
 * figures, and paid that cost per viewer.
 *
 * WHAT THE SPEC CONTROLS, AND WHAT IT DOES NOT. The spec chooses which
 * sections appear, in what order, which pre-aggregated series each bar section
 * reads, and what the headings say. It cannot supply a number, a formula or a
 * filter: every figure below comes from `overview`, which the metrics query
 * layer computed and reconciled. So an author composing a page can change what
 * a reader sees, never what a figure means.
 *
 * Author free text (`title`, `description`) is interpolated as a TEXT NODE.
 * There is no `dangerouslySetInnerHTML` in this file and there must never be
 * one: that placement is the entire defence for author input, since the
 * boundary schema deliberately stores titles verbatim rather than pretending
 * to sanitise them.
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
  description?: string;
  bars: NotebookBar[];
}) {
  // A section whose series is empty is not rendered at all. An empty card with
  // a heading reads as "this data is missing"; omitting it reads as what it is.
  if (bars.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <ul className="flex flex-col gap-4">
        {bars.map((bar) => (
          <BarRow key={bar.label} bar={bar} />
        ))}
      </ul>
    </section>
  );
}

function KpiSection({ stats }: { stats: NotebookStat[] }) {
  if (stats.length === 0) return null;

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.id}
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
  );
}

function ApplicationsSection({ entries }: { entries: { label: string; value: number }[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 md:p-6">
      <h2 className="text-base font-semibold text-foreground">Applications</h2>
      <dl className="grid gap-4 sm:grid-cols-3">
        {entries.map((entry) => (
          <div key={entry.label} className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">{entry.label}</dt>
            <dd className="text-xl font-semibold tabular-nums text-foreground">
              {entry.value.toLocaleString("en-US")}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * A paragraph of author context.
 *
 * `title` and `body` are interpolated as TEXT NODES, like every other author
 * string on this page. There is no markdown rendering and no
 * dangerouslySetInnerHTML — a body containing `<script>` is that many literal
 * characters on the page. `whitespace-pre-line` preserves the author's line
 * breaks without giving them any other markup.
 */
function TextSection({ section }: { section: NotebookTextSection }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-5 md:p-6">
      {section.title ? (
        <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
      ) : null}
      <p className="max-w-3xl whitespace-pre-line text-sm text-muted-foreground">{section.body}</p>
    </section>
  );
}

/**
 * The KPI tiles a spec section asks for, in the order it asks for them.
 *
 * Selected by `id` rather than by label, and silently skipping an id the
 * metrics layer did not compute: a spec naming a metric this build no longer
 * produces should lose that one tile, not throw away the page.
 */
function selectStats(section: NotebookKpisSection, overview: NotebookOverview): NotebookStat[] {
  return section.metrics
    .map((metric) => overview.stats.find((stat) => stat.id === metric))
    .filter((stat): stat is NotebookStat => stat !== undefined);
}

/**
 * The pre-aggregated series a bar section names.
 *
 * `source` alone determines the series — the schema already rejected any
 * source/metric pairing that names no series, so there is no invalid case to
 * handle here.
 */
function selectBars(section: NotebookBarsSection, overview: NotebookOverview): NotebookBar[] {
  return section.source === "programs" ? overview.funding : overview.completion;
}

/**
 * Consecutive bar sections share a two-column row; everything else is full
 * width.
 *
 * Bar sections are narrow by nature — a handful of labelled rows — so two of
 * them side by side is the layout the page was designed around, and it is what
 * the seeded dashboard reproduces. A LONE bar section gets no grid wrapper: a
 * single child in a two-column grid would render at half width beside empty
 * space, which looks like a section failed to load rather than like a choice.
 */
type SectionGroup =
  | { kind: "single"; section: NotebookSection }
  | { kind: "bars-row"; sections: NotebookBarsSection[] };

function groupSections(sections: NotebookSection[]): SectionGroup[] {
  const groups: SectionGroup[] = [];
  let run: NotebookBarsSection[] = [];

  const flushRun = () => {
    if (run.length === 0) return;
    groups.push(
      run.length === 1 ? { kind: "single", section: run[0] } : { kind: "bars-row", sections: run }
    );
    run = [];
  };

  for (const section of sections) {
    if (section.type === "bars") {
      run.push(section);
      continue;
    }
    flushRun();
    groups.push({ kind: "single", section });
  }
  flushRun();

  return groups;
}

function SectionView({
  section,
  overview,
}: {
  section: NotebookSection;
  overview: NotebookOverview;
}) {
  switch (section.type) {
    case "kpis":
      return <KpiSection stats={selectStats(section, overview)} />;
    case "bars":
      return (
        <BarSection
          title={section.title}
          description={section.description}
          bars={selectBars(section, overview)}
        />
      );
    case "applications":
      return <ApplicationsSection entries={overview.applications} />;
    case "text":
      return <TextSection section={section} />;
    default:
      // A section this build cannot draw is OMITTED, not rendered empty.
      //
      // It can only get here by being hand-written or by arriving from a
      // newer writer, because the composer offers nothing it cannot render
      // and the boundary schema rejects types it does not know. Drawing a
      // titled but bodyless block would tell a reader the data was missing,
      // when the truth is that this build does not know the section.
      return null;
  }
}

/** Stable enough to key a static, ordered list without leaning on the index alone. */
function sectionKey(section: NotebookSection, index: number): string {
  if (section.type === "bars") return `${index}-bars-${section.source}-${section.metric}`;
  return `${index}-${section.type}`;
}

export function NotebookOverviewView({
  overview,
  spec,
}: {
  overview: NotebookOverview;
  spec: NotebookSpec;
}) {
  let cursor = 0;

  return (
    <div className="flex flex-col gap-6">
      {groupSections(spec.sections).map((group) => {
        if (group.kind === "single") {
          const key = sectionKey(group.section, cursor);
          cursor += 1;
          return <SectionView key={key} section={group.section} overview={overview} />;
        }

        const key = `row-${sectionKey(group.sections[0], cursor)}`;
        const start = cursor;
        cursor += group.sections.length;

        return (
          <div key={key} className="grid gap-6 lg:grid-cols-2">
            {group.sections.map((section, offset) => (
              <SectionView
                key={sectionKey(section, start + offset)}
                section={section}
                overview={overview}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
