"use client";

import { ChevronDown } from "lucide-react";
import type { CriteriaSnapshot } from "@/types/donor-research";
import { briefDisplay, briefProse } from "./fonts";

interface QueryDisclosureProps {
  criteria: CriteriaSnapshot | null;
  donorHandleLabel: string | null;
}

/**
 * Tucked-away "Query" disclosure. Sits between the masthead and the
 * lead chapter. Closed by default — the prepared advisor already
 * knows what they asked — but one click away when they need to
 * remind themselves or show the donor the precise brief that
 * generated the report.
 */
export function QueryDisclosure({ criteria, donorHandleLabel }: QueryDisclosureProps) {
  if (!criteria && !donorHandleLabel) return null;

  return (
    <section className="mb-16">
      <details className="group border-y border-border/60">
        <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 py-3.5">
          <span
            className={`${briefDisplay.className} text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground`}
          >
            Query
          </span>
          <span
            className={`${briefDisplay.className} inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-foreground`}
          >
            <span className="group-open:hidden">View what was asked</span>
            <span className="hidden group-open:inline">Hide</span>
            <ChevronDown
              aria-hidden
              className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>

        <div className="grid grid-cols-1 gap-8 pb-8 pt-6 sm:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] sm:gap-12">
          {criteria ? (
            <div className="min-w-0">
              <p
                className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground`}
              >
                Criteria as submitted
              </p>
              <p
                className={`${briefProse.className} mt-3 max-w-[62ch] whitespace-pre-wrap text-[1rem] leading-[1.6] text-foreground/85`}
              >
                {criteria.criteriaText}
              </p>
            </div>
          ) : null}

          <dl
            className={`${briefDisplay.className} flex flex-col divide-y divide-border/50 border-y border-border/50 text-sm`}
          >
            {donorHandleLabel ? <Row label="Donor" value={donorHandleLabel} /> : null}
            {criteria?.cause ? <Row label="Cause" value={criteria.cause} /> : null}
            {criteria?.geography ? <Row label="Geography" value={criteria.geography} /> : null}
            {amountLabel(criteria?.amountMin, criteria?.amountMax) ? (
              <Row
                label="Grant size"
                value={amountLabel(criteria?.amountMin, criteria?.amountMax) as string}
                tabular
              />
            ) : null}
          </dl>
        </div>
      </details>
    </section>
  );
}

function Row({
  label,
  value,
  tabular = false,
}: {
  label: string;
  value: string;
  tabular?: boolean;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-baseline gap-x-4 py-2.5">
      <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className={`text-foreground/85 ${tabular ? "tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}

function amountLabel(
  min: number | null | undefined,
  max: number | null | undefined
): string | null {
  if (!min && !max) return null;
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  if (min && max) return `${fmt.format(min)}–${fmt.format(max)}`;
  if (min) return `From ${fmt.format(min)}`;
  return `Up to ${fmt.format(max as number)}`;
}
