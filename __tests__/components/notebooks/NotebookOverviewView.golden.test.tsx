import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotebookOverviewView } from "@/components/Pages/Communities/Notebooks/NotebookOverview";
import type { NotebookBar, NotebookOverview } from "@/services/notebook-overview.service";
import { NOTEBOOK_SEED_SPEC } from "@/services/notebooks/notebook-seed-spec";
import type { NotebookSpec } from "@/services/notebooks/notebook-spec";

/**
 * GOLDEN TEST — the seeded spec must reproduce the page we already shipped.
 *
 * The notebook page used to render a FIXED layout: four KPI tiles, two bar
 * sections side by side, then applications. WS-C3 replaced that with a render
 * driven by `config.spec.sections`. Nothing about the seeded Filecoin
 * dashboard was supposed to change in the process.
 *
 * "Supposed to" is not a guarantee, so `LegacyFixedLayout` below is the
 * pre-spec JSX, kept verbatim, and the assertion is that the spec-driven
 * renderer emits the same HTML for the same data. It is the only artefact that
 * still remembers what the page looked like before, which is exactly why it
 * lives in the test rather than in the component.
 *
 * WHEN THIS FAILS: either the seed spec drifted from the shipped layout, or
 * the renderer changed the markup. Both are real answers — decide which one
 * you meant, then update the seed spec or update this oracle deliberately.
 * Do not "fix" it by regenerating a snapshot.
 */

// ── The oracle: the layout as it stood before the spec drove it ──────────

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

function fillPercent(bar: NotebookBar): number {
  if (bar.total <= 0) return 0;
  return Math.max(0, Math.min(100, (bar.value / bar.total) * 100));
}

function LegacyBarRow({ bar }: { bar: NotebookBar }) {
  const percent = fillPercent(bar);

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex flex-row items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-foreground">{bar.label}</span>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{bar.caption}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      {bar.meta ? <span className="text-xs text-muted-foreground">{bar.meta}</span> : null}
    </li>
  );
}

function LegacyBarSection({
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
          <LegacyBarRow key={bar.label} bar={bar} />
        ))}
      </ul>
    </section>
  );
}

function LegacyFixedLayout({ overview }: { overview: NotebookOverview }) {
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
        <LegacyBarSection
          title="Disbursed against commitment"
          description="How much of each program's committed funding has actually been paid out. Bars share one scale, so program sizes are comparable."
          bars={overview.funding}
        />
        <LegacyBarSection
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

// ── Fixture: the real Filecoin figures, so the oracle is exercised on the
// numbers the seeded page actually shows.

function makeOverview(overrides: Partial<NotebookOverview> = {}): NotebookOverview {
  return {
    source: "gap-api",
    stale: false,
    generatedAt: "2026-08-29T01:00:00.000Z",
    currency: "USDC",
    stats: [
      { id: "committed", label: "Committed", value: 9246697, format: "currency" },
      {
        id: "disbursed",
        label: "Disbursed",
        value: 6369766,
        format: "currency",
        hint: "$2.9M still to pay out",
      },
      { id: "fundedProjects", label: "Funded projects", value: 48, format: "count" },
      {
        id: "milestoneCompletion",
        label: "Milestone completion",
        value: 52,
        format: "percent",
        hint: "102 of 197; cancelled excluded",
      },
    ],
    funding: [
      {
        label: "Filecoin ProPGF Batch 3",
        value: 0,
        total: 2168267,
        caption: "$0 of $2.2M",
        meta: "18 projects",
      },
      {
        label: "Filecoin ProPGF Batch 2",
        value: 563000,
        total: 614000,
        caption: "$563K of $614K",
        meta: "9 projects",
      },
    ],
    completion: [
      { label: "Kernel", value: 1.3, total: 100, caption: "1.3%", meta: "13 projects" },
      { label: "Tooling", value: 44.5, total: 100, caption: "44.5%", meta: "7 projects" },
    ],
    applications: [
      { label: "Approved", value: 52 },
      { label: "Under review", value: 151 },
      { label: "Not approved", value: 2 },
    ],
    ...overrides,
  };
}

function renderSpec(spec: NotebookSpec, overview: NotebookOverview): string {
  const { container } = render(<NotebookOverviewView overview={overview} spec={spec} />);
  return container.innerHTML;
}

function renderLegacy(overview: NotebookOverview): string {
  const { container } = render(<LegacyFixedLayout overview={overview} />);
  return container.innerHTML;
}

describe("notebook seed spec (golden)", () => {
  it("reproduces the pre-spec fixed layout exactly", () => {
    const overview = makeOverview();

    expect(renderSpec(NOTEBOOK_SEED_SPEC, overview)).toBe(renderLegacy(overview));
  });

  // The seeded page's own numbers are the ones a reader will check against
  // the community header, so pin them in the golden output rather than only
  // in a separate assertion that could pass while the layout dropped a tile.
  it("carries the canonical figures in the golden markup", () => {
    const html = renderSpec(NOTEBOOK_SEED_SPEC, makeOverview());

    expect(html).toContain("$9.25M");
    expect(html).toContain("$6.37M");
    expect(html).toContain(">48<");
    expect(html).toContain("102 of 197; cancelled excluded");
  });

  // An empty series drops its section in both renderers; the pairing must not
  // leave a stray grid wrapper behind on one side and not the other.
  it("matches the legacy layout when a series is empty", () => {
    const overview = makeOverview({ completion: [] });

    expect(renderSpec(NOTEBOOK_SEED_SPEC, overview)).toBe(renderLegacy(overview));
  });

  it("matches the legacy layout when there are no applications", () => {
    const overview = makeOverview({ applications: [] });

    expect(renderSpec(NOTEBOOK_SEED_SPEC, overview)).toBe(renderLegacy(overview));
  });
});

describe("spec-driven render", () => {
  it("renders sections in the order the spec lists them", () => {
    const html = renderSpec(
      {
        version: 1,
        sections: [{ type: "applications" }, { type: "kpis", metrics: ["committed"] }],
      },
      makeOverview()
    );

    expect(html.indexOf("Applications")).toBeLessThan(html.indexOf("Committed"));
  });

  it("renders only the KPI tiles the spec selects, in that order", () => {
    const html = renderSpec(
      { version: 1, sections: [{ type: "kpis", metrics: ["milestoneCompletion", "committed"] }] },
      makeOverview()
    );

    expect(html).toContain("Committed");
    expect(html).not.toContain("Funded projects");
    expect(html.indexOf("Milestone completion")).toBeLessThan(html.indexOf("Committed"));
  });

  it("reads the programs series for a programs section and tracks for tracks", () => {
    const programs = renderSpec(
      {
        version: 1,
        sections: [
          {
            type: "bars",
            source: "programs",
            metric: "disbursedVsCommitted",
            title: "Programs",
          },
        ],
      },
      makeOverview()
    );

    expect(programs).toContain("Filecoin ProPGF Batch 3");
    expect(programs).not.toContain("Kernel");
  });

  // A lone bar section must not sit at half width beside empty space — that
  // reads as a section that failed to load rather than as a layout choice.
  it("gives a lone bar section the full width, with no two-column wrapper", () => {
    const html = renderSpec(
      {
        version: 1,
        sections: [
          { type: "bars", source: "tracks", metric: "milestoneCompletion", title: "Tracks" },
        ],
      },
      makeOverview()
    );

    expect(html).not.toContain("lg:grid-cols-2");
  });

  it("pairs consecutive bar sections into one two-column row", () => {
    const html = renderSpec(
      {
        version: 1,
        sections: [
          { type: "bars", source: "programs", metric: "disbursedVsCommitted", title: "A" },
          { type: "bars", source: "tracks", metric: "milestoneCompletion", title: "B" },
        ],
      },
      makeOverview()
    );

    expect(html.match(/lg:grid-cols-2/g)).toHaveLength(1);
  });

  // Author free text is the only untrusted input on this page. It must reach
  // the DOM as a text node — the boundary stores it verbatim precisely
  // because this is where the defence lives.
  it("renders a title containing HTML as text, never as markup", () => {
    const html = renderSpec(
      {
        version: 1,
        sections: [
          {
            type: "bars",
            source: "programs",
            metric: "disbursedVsCommitted",
            title: '<img src=x onerror="alert(1)">',
            description: "<script>alert(2)</script>",
          },
        ],
      },
      makeOverview()
    );

    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain('&lt;img src=x onerror="alert(1)"&gt;');
    expect(html).toContain("&lt;script&gt;alert(2)&lt;/script&gt;");
  });

  // PROJECT-WIDE RULE. An absent measurement is not a measurement of zero:
  // "SLA met: 0%" and "not measured yet" are different claims about a
  // community's programme, and rendering the second as the first invents a
  // figure. Kernel KPIs are legitimately null, so this guards the widening.
  describe("absent KPI values", () => {
    it("renders a null value as an em-dash, never as zero", () => {
      const html = renderSpec(
        { version: 1, sections: [{ type: "kpis", metrics: ["milestoneCompletion"] }] },
        makeOverview({
          stats: [
            {
              id: "milestoneCompletion",
              label: "Milestone completion",
              value: null,
              format: "percent",
            },
          ],
        })
      );

      expect(html).toContain("—");
      expect(html).not.toContain("0.0%");
    });

    it("still renders a real zero as zero", () => {
      const html = renderSpec(
        { version: 1, sections: [{ type: "kpis", metrics: ["committed"] }] },
        makeOverview({
          stats: [{ id: "committed", label: "Committed", value: 0, format: "currency" }],
        })
      );

      expect(html).toContain("$0");
      expect(html).not.toContain("—");
    });
  });

  describe("text blocks", () => {
    it("renders a heading and body", () => {
      const html = renderSpec(
        {
          version: 1,
          sections: [{ type: "text", title: "How to read this", body: "Funding is committed." }],
        },
        makeOverview()
      );

      expect(html).toContain("How to read this");
      expect(html).toContain("Funding is committed.");
    });

    it("renders a body with no heading", () => {
      const html = renderSpec(
        { version: 1, sections: [{ type: "text", body: "Just context." }] },
        makeOverview()
      );

      expect(html).toContain("Just context.");
      expect(html).not.toContain("<h2");
    });

    // The body is the largest author-controlled string on the page, so this is
    // where an HTML-rendering mistake would hurt most. It must be a text node.
    it("renders markup in the body as literal text", () => {
      const html = renderSpec(
        {
          version: 1,
          sections: [
            {
              type: "text",
              title: "<b>bold</b>",
              body: '<img src=x onerror="alert(1)"><script>alert(2)</script>',
            },
          ],
        },
        makeOverview()
      );

      expect(html).not.toContain("<img");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("<b>bold</b>");
      expect(html).toContain("&lt;img");
      expect(html).toContain("&lt;script&gt;");
    });
  });

  // A section this build cannot draw is omitted rather than rendered as an
  // empty titled block, which a reader would take for missing data.
  it("omits a section type it cannot draw", () => {
    const html = renderSpec(
      {
        version: 1,
        sections: [
          { type: "kpis", metrics: ["committed"] },
          {
            type: "timeseries",
            source: "indicators",
            indicatorId: "5fadb30d-558d-45fc-b873-a8fe678cedd4",
            chartStyle: "line",
            title: "Pool TVL",
          },
        ],
      },
      makeOverview()
    );

    expect(html).toContain("Committed");
    expect(html).not.toContain("Pool TVL");
  });

  // A spec naming a metric this build no longer computes should cost one
  // tile, not the whole page.
  it("skips a KPI the metrics layer did not produce", () => {
    const overview = makeOverview({
      stats: [{ id: "committed", label: "Committed", value: 1, format: "currency" }],
    });
    const html = renderSpec(
      { version: 1, sections: [{ type: "kpis", metrics: ["committed", "disbursed"] }] },
      overview
    );

    expect(html).toContain("Committed");
    expect(html).not.toContain("Disbursed");
  });
});
