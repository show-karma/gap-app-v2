"use client";

import { ChevronDown } from "lucide-react";
import type { CriteriaSnapshot } from "@/types/donor-research";

interface QueryDisclosureProps {
  criteria: CriteriaSnapshot | null;
  donorHandleLabel: string | null;
}

/**
 * Collapsed-by-default "Query" disclosure sitting between the header and
 * the lead candidate. The prepared advisor already knows what they
 * asked — but it's one click away when they need to remind themselves or
 * show the donor the precise brief that generated the report.
 */
export function QueryDisclosure({ criteria, donorHandleLabel }: QueryDisclosureProps) {
  if (!criteria && !donorHandleLabel) return null;

  return (
    <details className="group rounded-sf-card border border-sf-line bg-sf-card">
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 px-6 py-3.5">
        <span className="text-[11px] font-[650] uppercase tracking-[0.14em] text-sf-muted">
          Query
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-[650] uppercase tracking-[0.1em] text-sf-muted transition-colors group-hover:text-sf-heading">
          <span className="group-open:hidden">View what was asked</span>
          <span className="hidden group-open:inline">Hide</span>
          <ChevronDown
            aria-hidden
            className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
          />
        </span>
      </summary>

      <div className="grid grid-cols-1 gap-8 border-t border-sf-line px-6 pb-6 pt-5 sm:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] sm:gap-10">
        {criteria ? (
          <div className="min-w-0">
            <p className="text-[10.5px] font-[650] uppercase tracking-[0.14em] text-sf-muted">
              Criteria as submitted
            </p>
            <p className="mt-2 max-w-[62ch] whitespace-pre-wrap text-[13.5px] leading-[1.6] text-sf-ink">
              {criteria.criteriaText}
            </p>
          </div>
        ) : null}

        <dl className="flex flex-col divide-y divide-sf-line border-y border-sf-line text-[13px]">
          {donorHandleLabel ? <Row label="Donor" value={donorHandleLabel} /> : null}
          {criteria?.cause ? <Row label="Cause" value={criteria.cause} /> : null}
          {criteria?.geography ? <Row label="Geography" value={criteria.geography} /> : null}
          {amountLabel(criteria?.amountMin, criteria?.amountMax) ? (
            <Row
              label="Grant size"
              tabular
              value={amountLabel(criteria?.amountMin, criteria?.amountMax) as string}
            />
          ) : null}
        </dl>
      </div>
    </details>
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
      <dt className="text-[10px] font-[650] uppercase tracking-[0.12em] text-sf-muted">{label}</dt>
      <dd className={`text-sf-ink ${tabular ? "font-mono tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}

const USD_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function amountLabel(
  min: number | null | undefined,
  max: number | null | undefined
): string | null {
  if (!min && !max) return null;
  const fmt = USD_FORMAT;
  if (min && max) return `${fmt.format(min)}–${fmt.format(max)}`;
  if (min) return `From ${fmt.format(min)}`;
  return `Up to ${fmt.format(max as number)}`;
}
