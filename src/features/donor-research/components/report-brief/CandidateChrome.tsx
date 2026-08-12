import { ArrowUpRight } from "lucide-react";
import type { BadgeTone } from "@/components/Pages/Dashboard/v3/primitives";
import { badgeClasses } from "@/components/Pages/Dashboard/v3/soft-classes";
import type { RecentMention } from "@/types/donor-research";
import { cn } from "@/utilities/tailwind";
import { formatEin, hostname } from "./text-utils";

/**
 * Shared visual building blocks for the candidate sections (Soft redesign,
 * spec 2.3). `LeadCandidate` and `RunnerUpCandidate` compose the same
 * pieces at two sizes — the lead reads visually richer but the underlying
 * card structure (rank badge, org meta row, composite readout, "Our take"
 * callout, coverage list) is identical, per spec: "same component
 * structure."
 */

/* ── Rank badge ───────────────────────────────────────────────── */

export function RankBadge({
  rank,
  label,
  emphasis,
}: {
  rank: number;
  label: string;
  emphasis: "lead" | "runner-up";
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          badgeClasses(emphasis === "lead" ? "brand" : "gray"),
          "font-mono tabular-nums"
        )}
      >
        #{rank}
      </span>
      <span className="text-[11px] font-[650] uppercase tracking-[0.12em] text-sf-muted">
        {label}
      </span>
    </div>
  );
}

/* ── Org identity ─────────────────────────────────────────────── */

export function CandidateName({
  name,
  size,
  disqualified,
}: {
  name: string;
  size: "lead" | "runner-up";
  disqualified: boolean;
}) {
  // The lead/runner-up candidate sections are top-level siblings of
  // "Also considered" / "Comparison" / "Methodology" (all h2) — the
  // candidate name IS that section's heading, so it must be an h2 too,
  // not an h3 with no h2 ancestor. (Only used by `LeadCandidate` /
  // `RunnerUpCandidate`; `CandidateCard`'s own h3 lives nested under the
  // "Also considered" h2 and is correct as-is.)
  return (
    <h2
      className={cn(
        "text-balance font-bold leading-[1.1] tracking-[-0.02em]",
        size === "lead" ? "text-[1.75rem] sm:text-[2rem]" : "text-xl",
        disqualified ? "text-sf-muted line-through decoration-1" : "text-sf-heading"
      )}
    >
      {name}
    </h2>
  );
}

export function CandidateMetaRow({
  locale,
  ein,
  showEin,
  websiteUrl,
}: {
  locale: string | null;
  ein: string | null;
  /** Legacy candidates carry an EIN without a resolved org name — hide it then (matches prior behavior). */
  showEin: boolean;
  websiteUrl: string | null;
}) {
  if (!locale && !(ein && showEin) && !websiteUrl) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12.5px]">
      {locale ? <span className="font-medium text-sf-muted">{locale}</span> : null}
      {ein && showEin ? (
        <span className="font-mono tabular-nums text-sf-muted">EIN {formatEin(ein)}</span>
      ) : null}
      {websiteUrl ? (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-brand-emphasis underline-offset-[3px] hover:underline dark:text-brand-subtle"
        >
          {hostname(websiteUrl)}
          <ArrowUpRight aria-hidden className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  );
}

/* ── Composite readout ────────────────────────────────────────── */

function bandTone(composite100: number, disqualified: boolean): BadgeTone {
  if (disqualified) return "gray";
  if (composite100 >= 40) return "brand";
  if (composite100 >= 25) return "amber";
  return "gray";
}

export function CompositeReadout({
  composite100,
  band,
  disqualified,
  size,
}: {
  composite100: number;
  band: string;
  disqualified: boolean;
  size: "lead" | "runner-up";
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span
        className={cn(
          "font-mono font-[750] leading-none tabular-nums text-sf-heading",
          size === "lead" ? "text-4xl" : "text-3xl"
        )}
      >
        {composite100}
        <span className="ml-1 text-sm font-normal text-sf-muted">/100</span>
      </span>
      <span className={badgeClasses(bandTone(composite100, disqualified))}>{band}</span>
    </div>
  );
}

/* ── "Our take" callout ───────────────────────────────────────── */

export function OurTake({ text }: { text: string }) {
  return (
    <section className="grid gap-2 border-y border-sf-line py-4 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-5">
      <p className="pt-0.5 text-[10.5px] font-[650] uppercase tracking-[0.14em] text-sf-muted">
        Our take
      </p>
      <p className="max-w-[62ch] text-[14.5px] leading-[1.6] text-sf-ink">{text}</p>
    </section>
  );
}

/* ── Recent coverage ──────────────────────────────────────────── */

const MONTH_ABBREVS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTH_ABBREVS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function CandidateCoverage({
  mentions,
  limit,
}: {
  mentions: readonly RecentMention[];
  limit: number;
}) {
  const items = mentions.slice(0, limit);
  if (items.length === 0) return null;
  return (
    <div className="mt-5">
      <p className="text-[10.5px] font-[650] uppercase tracking-[0.14em] text-sf-muted">
        Recent coverage
      </p>
      <ul className="mt-2.5 flex flex-col gap-2.5">
        {items.map((mention) => (
          <li key={mention.url}>
            <a
              href={mention.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 text-[13.5px]"
            >
              <span className="mt-0.5 w-[38px] shrink-0 font-mono text-[10.5px] uppercase tabular-nums text-sf-muted">
                {mention.publishedDate ? formatShortDate(mention.publishedDate) : "—"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1">
                  <span className="truncate text-sf-ink underline-offset-[3px] group-hover:text-sf-heading group-hover:underline">
                    {mention.title ?? hostname(mention.url)}
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="h-3 w-3 shrink-0 text-sf-muted transition-colors group-hover:text-sf-heading"
                  />
                </span>
                <span className="mt-0.5 block text-[11px] uppercase tracking-[0.08em] text-sf-muted">
                  <span className={mention.kind === "own_domain" ? "italic" : ""}>
                    {mention.publisher ?? hostname(mention.url)}
                  </span>
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LastMention({ label }: { label: string }) {
  return (
    <div className="mt-5 flex items-baseline justify-between border-t border-sf-line pt-3">
      <span className="text-[10.5px] font-[650] uppercase tracking-[0.14em] text-sf-muted">
        Last mention
      </span>
      <span className="text-[13px] text-sf-ink">{label}</span>
    </div>
  );
}
