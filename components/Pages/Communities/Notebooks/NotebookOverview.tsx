import type {
  NotebookBar,
  NotebookOverview,
  NotebookStat,
} from "@/services/notebook-overview.service";
import { NOTEBOOK_ABSENT_VALUE } from "@/services/notebooks/notebook-metrics.types";
import type { NotebookPageData } from "@/services/notebooks/notebook-page-data.types";
import { querySectionKey, seriesKey } from "@/services/notebooks/notebook-page-data.types";
import type {
  NotebookBarsSection,
  NotebookComposedSpec,
  NotebookKpisSection,
  NotebookQuerySection,
  NotebookSection,
  NotebookTableSection,
  NotebookTextSection,
  NotebookTiersSection,
  NotebookTimeseriesSection,
} from "@/services/notebooks/notebook-spec";
import {
  extractNarrativeTokens,
  isKernelKpiMetric,
  NOTEBOOK_KPI_METRICS,
  type NotebookKpiMetric,
  resolveNotebookDateRange,
  resolveNotebookKernelRange,
} from "@/services/notebooks/notebook-spec";
import { NotebookCustomSection } from "./NotebookCustomSection";
import {
  HeaderSection,
  HeroSection,
  NarrativeSection,
  NavSection,
  sectionAnchorId,
} from "./NotebookEditorial";
import { NotebookKernelTable } from "./NotebookKernelTable";
import { NotebookQueryTable } from "./NotebookQueryTable";
import { NotebookTierTable } from "./NotebookTierTable";
import { NotebookTimeSeries } from "./NotebookTimeSeries";

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

/**
 * A KPI value as text, or the absent marker.
 *
 * `null` is NOT zero. An unmeasured figure rendered as "0%" is a claim the
 * data does not support — see NOTEBOOK_ABSENT_VALUE.
 */
function formatStat(value: number | null, format: "currency" | "count" | "percent"): string {
  if (value === null) return NOTEBOOK_ABSENT_VALUE;
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
 * A section that needs data this page could not load.
 *
 * Said plainly rather than drawn empty. An empty chart or a headed-but-blank
 * table reads as "this community has no data"; the truth is that we could not
 * fetch it, which is our problem and not a fact about their programme.
 */
function SectionUnavailable({ title }: { title: string }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-5 md:p-6">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">This data could not be loaded right now.</p>
    </section>
  );
}

function TimeseriesSection({
  section,
  data,
}: {
  section: NotebookTimeseriesSection;
  data?: NotebookPageData;
}) {
  const key = seriesKey(section.indicatorId, resolveNotebookDateRange(section.range));
  const series = data?.series[key];

  // `undefined` means nothing asked for it (no data loader in this render);
  // `null` means it was asked for and failed — including the dangling-indicator
  // case, where the id points at a row that no longer exists.
  if (series === undefined || series === null) {
    return <SectionUnavailable title={section.title} />;
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
        {section.description ? (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        ) : null}
      </div>
      <NotebookTimeSeries series={series} chartStyle={section.chartStyle} />
    </section>
  );
}

/**
 * A composed catalogue query.
 *
 * The spec stored the QUESTION; the loader asked it; this renders the answer
 * exactly as the query layer formatted it. A query whose fetch failed renders
 * the unavailable state rather than an empty table, because an empty table
 * reads as "the answer is nothing" and that is a different claim.
 */
function QuerySection({
  section,
  data,
}: {
  section: NotebookQuerySection;
  data?: NotebookPageData;
}) {
  const result = data?.queries?.[querySectionKey(section)];
  if (!result) return <SectionUnavailable title={section.title} />;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
        {section.description ? (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        ) : null}
      </div>
      <NotebookQueryTable result={result} />
    </section>
  );
}

/**
 * The tier rollup section.
 *
 * Carries no column choice of its own — see the section schema. It renders the
 * rollup exactly as the query layer declared it, so this component and the
 * composer cannot disagree about what a tier table is.
 */
function TiersSection({
  section,
  data,
}: {
  section: NotebookTiersSection;
  data?: NotebookPageData;
}) {
  const rollup = data?.tierRollup;
  if (!rollup) return <SectionUnavailable title={section.title} />;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
        {section.description ? (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        ) : null}
      </div>
      <NotebookTierTable rollup={rollup} />
    </section>
  );
}

function TableSection({
  section,
  data,
}: {
  section: NotebookTableSection;
  data?: NotebookPageData;
}) {
  const kernel = data?.kernel[resolveNotebookKernelRange(section.range)];
  if (!kernel) return <SectionUnavailable title={section.title} />;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
        {section.description ? (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        ) : null}
      </div>
      <NotebookKernelTable
        columns={section.columns}
        declared={kernel.inventory.columns}
        rows={kernel.inventory.rows}
      />
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
function selectStats(
  section: NotebookKpisSection,
  overview: NotebookOverview,
  data?: NotebookPageData
): NotebookStat[] {
  const kernel = data?.kernel[resolveNotebookKernelRange(section.kernelRange)];

  return section.metrics
    .map((metric) => {
      // The `kernel` prefix on the id is what says which layer computes the
      // figure — there is no second `source` field to disagree with it.
      if (isKernelKpiMetric(metric)) {
        const kpi = kernel?.kpis.find((candidate) => candidate.id === metric);
        return kpi
          ? ({
              id: metric,
              label: kpi.label,
              value: kpi.value,
              format: kpi.format,
              hint: kpi.hint,
            } satisfies NotebookStat)
          : undefined;
      }
      return overview.stats.find((stat) => stat.id === metric);
    })
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

/**
 * Wraps a section in its anchor target so the auto nav can reach it.
 *
 * ONLY on a page that HAS a nav, and that condition is load-bearing rather
 * than an optimisation. Anchors exist to be jumped to; a page with nothing to
 * jump from does not need them, and emitting them anyway would add a wrapper
 * element to every section of every page ever published — changing the markup
 * of pages composed long before this feature existed. The golden test caught
 * exactly that, which is what it is for.
 *
 * Applied at this level rather than inside each section so every type is
 * anchorable without each one remembering to be: the nav lists what it can
 * see, and a section that quietly lacked an id would produce a dead link.
 * `scroll-mt` keeps a jumped-to heading clear of a sticky header.
 */
function SectionAnchor({
  section,
  index,
  enabled,
  children,
}: {
  section: NotebookSection;
  index: number;
  enabled: boolean;
  children: React.ReactNode;
}) {
  if (!enabled) return <>{children}</>;

  return (
    <div id={sectionAnchorId(section, index)} className="scroll-mt-24">
      {children}
    </div>
  );
}

/**
 * The KPI metrics a narrative body references.
 *
 * The schema already refused unknown tokens on write, so anything here is a
 * real metric id; the filter guards the case of a document written by a newer
 * vocabulary reaching an older renderer, where an unrecognised token resolves
 * to absent rather than throwing.
 */
function narrativeMetrics(body: string): NotebookKpiMetric[] {
  const known = new Set<string>(NOTEBOOK_KPI_METRICS);
  return extractNarrativeTokens(body).filter((token): token is NotebookKpiMetric =>
    known.has(token)
  );
}

function SectionView({
  section,
  overview,
  data,
  sections,
  index,
}: {
  section: NotebookSection;
  overview: NotebookOverview;
  data?: NotebookPageData;
  /** The whole page, so an auto-derived nav can index it. */
  sections: NotebookSection[];
  index: number;
}) {
  switch (section.type) {
    case "kpis":
      return <KpiSection stats={selectStats(section, overview, data)} />;
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
    case "custom-html":
      return <NotebookCustomSection section={section} />;
    case "header":
      return <HeaderSection section={section} />;
    case "hero":
      return <HeroSection section={section} />;
    case "nav":
      return <NavSection section={section} sections={sections} />;
    case "narrative":
      return (
        <NarrativeSection
          section={section}
          // Resolve exactly the tokens this body names, through the SAME
          // selector the KPI tiles use — so a figure quoted in prose and the
          // same figure in a tile cannot come from different places.
          stats={selectStats(
            {
              type: "kpis",
              metrics: narrativeMetrics(section.body),
              kernelRange: section.kernelRange,
            },
            overview,
            data
          )}
          anchorId={sectionAnchorId(section, index)}
        />
      );
    case "timeseries":
      return <TimeseriesSection section={section} data={data} />;
    case "table":
      return <TableSection section={section} data={data} />;
    case "tiers":
      return <TiersSection section={section} data={data} />;
    case "query":
      return <QuerySection section={section} data={data} />;
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
  // Custom blocks are keyed by POSITION ALONE, like every other section.
  //
  // Keying on the document would look more precise and would be wrong: every
  // edit would change the key, React would unmount the iframe and mount a new
  // one, and the handshake would start again from nothing — so each keystroke
  // in the editor would blank the preview and rebuild it. The frame handles
  // its own updates by posting the new document over the port it already has,
  // which is the entire reason that port exists.
  return `${index}-${section.type}`;
}

export function NotebookOverviewView({
  overview,
  spec,
  data,
}: {
  overview: NotebookOverview;
  spec: NotebookComposedSpec;
  /**
   * The v2 datasets — kernel windows and indicator series.
   *
   * OPTIONAL on purpose. A v1 spec names none of them, so it renders through
   * exactly the same path it always did with this prop absent, which is what
   * lets the golden test stay literally unchanged rather than adjusted to a
   * new signature. Sections that need it and do not get it say so.
   */
  data?: NotebookPageData;
}) {
  let cursor = 0;
  // Anchors are emitted only when something links to them; see SectionAnchor.
  const hasNav = spec.sections.some((section) => section.type === "nav");

  return (
    <div className="flex flex-col gap-6">
      {groupSections(spec.sections).map((group) => {
        if (group.kind === "single") {
          const key = sectionKey(group.section, cursor);
          const at = cursor;
          cursor += 1;
          return (
            <SectionAnchor key={key} section={group.section} index={at} enabled={hasNav}>
              <SectionView
                section={group.section}
                overview={overview}
                data={data}
                sections={spec.sections}
                index={at}
              />
            </SectionAnchor>
          );
        }

        const key = `row-${sectionKey(group.sections[0], cursor)}`;
        const start = cursor;
        cursor += group.sections.length;

        return (
          <div key={key} className="grid gap-6 lg:grid-cols-2">
            {group.sections.map((section, offset) => (
              <SectionAnchor
                key={sectionKey(section, start + offset)}
                section={section}
                index={start + offset}
                enabled={hasNav}
              >
                <SectionView
                  section={section}
                  overview={overview}
                  data={data}
                  sections={spec.sections}
                  index={start + offset}
                />
              </SectionAnchor>
            ))}
          </div>
        );
      })}
    </div>
  );
}
