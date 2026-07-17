"use client";

import { ChevronDown } from "lucide-react";
import pluralize from "pluralize";
import type { CompositeWeights, GeographyDiagnostic } from "@/types/donor-research";
import { methodologyWeightRows } from "./scoring";

interface MethodologyProps {
  candidatesCount: number;
  surfacedCount: number;
  geographyDiagnostic: GeographyDiagnostic | null;
  /**
   * The report's persisted composite weights (basis points). `null` marks a
   * legacy four-dimension report — the colophon then renders the legacy
   * four rows and the fixed-weight wording.
   */
  weights: CompositeWeights | null;
}

/**
 * Collapsed-by-default methodology section closing the brief: how the
 * pool was built, how the composite is scored, and what the brief is
 * (and isn't).
 */
export function Methodology({
  candidatesCount,
  surfacedCount,
  geographyDiagnostic,
  weights,
}: MethodologyProps) {
  const weightRows = methodologyWeightRows(weights);
  return (
    <details
      className="group rounded-sf-card border border-sf-line bg-sf-card"
      data-section="methodology"
    >
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 px-6 py-4">
        <h2 className="text-lg font-bold tracking-[-0.01em] text-sf-heading">
          How this brief was assembled
        </h2>
        <span className="inline-flex shrink-0 items-center gap-1.5 self-end text-[11px] font-[650] uppercase tracking-[0.1em] text-sf-muted transition-colors group-hover:text-sf-heading">
          <span className="group-open:hidden">Read more</span>
          <span className="hidden group-open:inline">Hide</span>
          <ChevronDown
            aria-hidden
            className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
          />
        </span>
      </summary>

      <div className="grid grid-cols-1 gap-x-10 gap-y-8 border-t border-sf-line px-6 pb-6 pt-6 sm:grid-cols-2">
        <ColophonBlock label="Pool">
          <p>
            We started from {candidatesCount.toLocaleString()}{" "}
            {pluralize("organization", candidatesCount)} the model surfaced against your cause,
            geography, and amount criteria. {surfacedCount} cleared compliance, recency, and mission
            match to reach this brief.
          </p>
        </ColophonBlock>

        <ColophonBlock label="Scoring">
          <p>
            {weights
              ? "The composite is a weighted sum of these dimensions, at the weights set for this report:"
              : "The composite is a fixed weighted sum, in this order of priority:"}
          </p>
          <ul className="mt-3 flex flex-col gap-1 font-mono tabular-nums text-sf-ink">
            {weightRows.map((row) => (
              <li className="flex items-baseline justify-between gap-3" key={row.label}>
                <span>{row.label}</span>
                <span className="text-sf-muted">{row.percent}%</span>
              </li>
            ))}
          </ul>
        </ColophonBlock>

        <ColophonBlock label="Sources">
          <p>
            IRS Publication 78 (active 501(c)(3) status), most recent indexed IRS Form 990, the
            California Registry of Charitable Trusts where applicable, and a multi-signal web search
            disambiguated against each nonprofit's name, EIN, locale, and primary contact phone.
          </p>
        </ColophonBlock>

        <ColophonBlock label="Geography">
          <GeographyExplanation diagnostic={geographyDiagnostic} />
        </ColophonBlock>

        <ColophonBlock label="What this is">
          <p>
            A research aid. The brief surfaces candidates we'd suggest reading further on — it does
            not vouch for them, and it doesn't replace the diligence calls you'd run before cutting
            a cheque.
          </p>
        </ColophonBlock>

        <ColophonBlock label="What it isn't">
          <p>
            A rating, a tax-deductibility guarantee, or an exhaustive list of every aligned
            organization. Filings lag, and quiet nonprofits will look quieter here than they are in
            real life.
          </p>
        </ColophonBlock>
      </div>
    </details>
  );
}

function ColophonBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="max-w-[44ch]">
      <p className="text-[10.5px] font-[650] uppercase tracking-[0.14em] text-sf-muted">{label}</p>
      <div className="mt-2 text-[13.5px] leading-[1.6] text-sf-ink">{children}</div>
    </div>
  );
}

function GeographyExplanation({ diagnostic }: { diagnostic: GeographyDiagnostic | null }) {
  if (!diagnostic || !diagnostic.inputGeography) {
    return (
      <p>
        No geography filter was applied — the search drew nationally from across the United States.
      </p>
    );
  }
  if (diagnostic.radius === "national") {
    return <p>National scope: the search drew from across the United States.</p>;
  }
  const states = diagnostic.resolvedStates;
  const cities = diagnostic.resolvedCities;
  if (cities.length > 0) {
    const sample = cities.slice(0, 4).join(", ");
    const more = cities.length > 4 ? `, plus ${cities.length - 4} more` : "";
    return (
      <p>
        We read &ldquo;{diagnostic.inputGeography}&rdquo; as a {diagnostic.radius}-level scope
        covering {sample}
        {more}
        {states.length > 0 ? ` (${states.join(", ")})` : ""}.
      </p>
    );
  }
  if (states.length > 0) {
    return (
      <p>
        We read &ldquo;{diagnostic.inputGeography}&rdquo; as {states.join(", ")}.
      </p>
    );
  }
  return (
    <p>
      We couldn't confidently interpret &ldquo;{diagnostic.inputGeography}&rdquo; as a US locale, so
      the search ran without a geography filter. Re-running with a clearer locale will tighten the
      pool.
    </p>
  );
}
