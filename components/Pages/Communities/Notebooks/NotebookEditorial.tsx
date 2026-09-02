import type { NotebookOverview, NotebookStat } from "@/services/notebook-overview.service";
import { NOTEBOOK_ABSENT_VALUE } from "@/services/notebooks/notebook-metrics.types";
import {
  extractNarrativeTokens,
  type NotebookHeaderSection,
  type NotebookHeroSection,
  type NotebookNarrativeSection,
  type NotebookSection,
} from "@/services/notebooks/notebook-spec";

/**
 * The editorial layer: the chrome that makes a data page read like a page.
 *
 * None of it ships client JavaScript, and none of it renders markup an author
 * supplied. Every author string below reaches the DOM as a TEXT NODE, which is
 * the same guarantee the rest of this renderer makes and the reason the whole
 * vocabulary can stay open to prose without being open to injection.
 */

// ── Anchors ──────────────────────────────────────────────────

/**
 * A section's anchor id, derived rather than stored.
 *
 * Deriving keeps the spec smaller and, more importantly, keeps the nav honest:
 * there is no second copy of the page's structure to drift from the first. The
 * index is part of the id so two sections sharing a title still get distinct
 * anchors instead of one silently swallowing the other's link.
 */
export function sectionAnchorId(section: NotebookSection, index: number): string {
  const title = sectionTitle(section);
  const slug = (title ?? section.type)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `section-${index + 1}${slug ? `-${slug}` : ""}`;
}

/**
 * The heading a section shows, or undefined when it shows none.
 *
 * The nav indexes exactly what a reader can see and scroll to — a section with
 * no visible heading has nothing to name it by, so it is not listed rather
 * than listed under an invented label.
 */
export function sectionTitle(section: NotebookSection): string | undefined {
  switch (section.type) {
    case "bars":
    case "timeseries":
    case "table":
    case "tiers":
    case "query":
      return section.title;
    case "text":
    case "narrative":
    case "nav":
      return section.title;
    case "hero":
      return section.headline;
    case "applications":
      return "Applications";
    case "custom-html":
      // IT HAS A `title` AND DELIBERATELY DOES NOT RETURN IT. That field is
      // the frame's accessible name, not a heading: nothing draws it, because
      // a seamless block draws no chrome of its own. Listing it in the nav
      // would give a reader a link that scrolls to no visible heading, which
      // reads as a broken anchor rather than as a section without one.
      return undefined;
    default:
      return undefined;
  }
}

// ── Sections ─────────────────────────────────────────────────

export function HeaderSection({ section }: { section: NotebookHeaderSection }) {
  if (!section.eyebrow && !section.breadcrumbs?.length) return null;

  return (
    <header className="flex flex-col gap-2">
      {section.breadcrumbs?.length ? (
        // A trail, not navigation: these are labels saying where the page
        // sits, and they are deliberately not links. Author-supplied hrefs
        // would turn a community page into a redirector.
        <p className="flex flex-row flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {section.breadcrumbs.map((crumb, index) => (
            <span key={crumb} className="flex flex-row items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              <span>{crumb}</span>
            </span>
          ))}
        </p>
      ) : null}
      {section.eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {section.eyebrow}
        </p>
      ) : null}
    </header>
  );
}

export function HeroSection({ section }: { section: NotebookHeroSection }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="max-w-4xl text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
        {section.headline}
      </h2>
      {section.subheadline ? (
        <p className="max-w-2xl text-base text-muted-foreground">{section.subheadline}</p>
      ) : null}
    </section>
  );
}

/**
 * Anchor nav over the page's own titled sections.
 *
 * Rendered from the section list it sits in, so it indexes what is actually
 * there. It excludes itself — a link to the nav from the nav is noise — and
 * anything without a heading, which has no honest label.
 */
export function NavSection({
  section,
  sections,
}: {
  section: { title?: string };
  sections: NotebookSection[];
}) {
  const entries = sections
    .map((candidate, index) => ({
      id: sectionAnchorId(candidate, index),
      label: sectionTitle(candidate),
      type: candidate.type,
    }))
    .filter(
      (entry): entry is { id: string; label: string; type: NotebookSection["type"] } =>
        entry.type !== "nav" && entry.type !== "header" && Boolean(entry.label)
    );

  if (entries.length === 0) return null;

  return (
    <nav
      aria-label={section.title ?? "On this page"}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-4"
    >
      {section.title ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {section.title}
        </p>
      ) : null}
      <ul className="flex flex-row flex-wrap gap-x-4 gap-y-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {entry.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Format one token's value the way the KPI tile formats it.
 *
 * Sharing the formatting is the point: a page that says "$9.25M committed" in
 * prose and shows `$9.25M` in a tile is one page. If these diverged, a reader
 * comparing them would be right to distrust both.
 */
function formatToken(stat: NotebookStat | undefined): string {
  // An absent figure is the em-dash here too — prose saying "0%" for something
  // nobody measured is the same fabrication in a different typeface.
  if (!stat || stat.value === null) return NOTEBOOK_ABSENT_VALUE;
  if (stat.format === "currency") {
    const value = stat.value;
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`;
    return `$${Math.round(value)}`;
  }
  if (stat.format === "percent") return `${stat.value.toFixed(1)}%`;
  return stat.value.toLocaleString("en-US");
}

/**
 * Prose with its placeholders resolved.
 *
 * The body is split on `{{token}}` boundaries and emitted as an ARRAY OF
 * STRINGS. React escapes each one, so neither the author's prose nor a
 * substituted value can introduce markup — and crucially the substitution
 * happens in the React tree rather than in the string, so there is never an
 * intermediate moment where author text and data share one HTML string that
 * something downstream might be tempted to render as HTML.
 */
export function NarrativeSection({
  section,
  stats,
  anchorId,
}: {
  section: NotebookNarrativeSection;
  stats: NotebookStat[];
  anchorId: string;
}) {
  const tokens = extractNarrativeTokens(section.body);
  const parts = section.body.split(/\{\{[^{}]*\}\}/);

  return (
    <section
      id={anchorId}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-5 md:p-6"
    >
      {section.title ? (
        <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
      ) : null}
      <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {parts.map((part, index) => {
          const token = tokens[index];
          const stat = token ? stats.find((candidate) => candidate.id === token) : undefined;
          return (
            // Index keys: this is a positional split of one immutable string,
            // so a part's position IS its identity.
            // biome-ignore lint/suspicious/noArrayIndexKey: positional split of an immutable string
            <span key={`${anchorId}-part-${index}`}>
              {part}
              {token ? (
                <span className="font-semibold tabular-nums text-foreground">
                  {formatToken(stat)}
                </span>
              ) : null}
            </span>
          );
        })}
      </p>
    </section>
  );
}

export type { NotebookOverview };
