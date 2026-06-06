"use client";

import { ChevronDown } from "lucide-react";
import type { GeographyDiagnostic } from "@/types/donor-research";
import { briefDisplay, briefProse } from "./fonts";
import { COMPONENT_WEIGHTS } from "./scoring";

interface MethodologyProps {
  candidatesCount: number;
  surfacedCount: number;
  geographyDiagnostic: GeographyDiagnostic | null;
}

/**
 * Editorial colophon. Closes the brief with a short, collapsed
 * statement of how the recommendation was assembled. Stays out of
 * the reader's way until they ask for it; the chapter mark
 * deliberately matches the rest of the document so the footer
 * feels like a final chapter, not a tooltip.
 */
export function Methodology({
  candidatesCount,
  surfacedCount,
  geographyDiagnostic,
}: MethodologyProps) {
  return (
    <section className="mt-8 border-t border-border/70 pt-10">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4">
          <div className="min-w-0">
            <p
              className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground`}
            >
              Colophon
            </p>
            <h2
              className={`${briefDisplay.className} mt-2 text-[clamp(1.25rem,2.4vw,1.5rem)] font-medium leading-tight tracking-[-0.012em] text-foreground`}
            >
              How this brief was assembled.
            </h2>
          </div>
          <span
            className={`${briefDisplay.className} inline-flex shrink-0 items-center gap-1.5 self-end text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-foreground`}
          >
            <span className="group-open:hidden">Read more</span>
            <span className="hidden group-open:inline">Hide</span>
            <ChevronDown
              aria-hidden
              className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>

        <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2">
          <ColophonBlock label="Pool">
            <p>
              We started from {candidatesCount.toLocaleString()}{" "}
              {candidatesCount === 1 ? "organization" : "organizations"} the model surfaced against
              your cause, geography, and amount criteria. {surfacedCount} cleared compliance,
              recency, and mission match to reach this brief.
            </p>
          </ColophonBlock>

          <ColophonBlock label="Scoring">
            <p>The composite is a fixed weighted sum, in this order of priority:</p>
            <ul className="mt-3 flex flex-col gap-1 tabular-nums text-foreground/85">
              {[
                ["Online presence", COMPONENT_WEIGHTS.freshness],
                ["IRS 990 recency", COMPONENT_WEIGHTS.impactRecency],
                ["Mission match", COMPONENT_WEIGHTS.donorMatch],
                ["Compliance", COMPONENT_WEIGHTS.compliance],
              ].map(([label, weight]) => (
                <li key={String(label)} className="flex items-baseline justify-between gap-3">
                  <span>{label}</span>
                  <span className="text-muted-foreground">
                    {Math.round((weight as number) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </ColophonBlock>

          <ColophonBlock label="Sources">
            <p>
              IRS Publication 78 (active 501(c)(3) status), most recent indexed IRS Form 990, the
              California Registry of Charitable Trusts where applicable, and a multi-signal Exa web
              search disambiguated against each nonprofit's name, EIN, locale, and primary contact
              phone.
            </p>
          </ColophonBlock>

          <ColophonBlock label="Geography">
            <GeographyExplanation diagnostic={geographyDiagnostic} />
          </ColophonBlock>

          <ColophonBlock label="What this is">
            <p>
              A research aid. The brief surfaces candidates we'd suggest reading further on — it
              does not vouch for them, and it doesn't replace the diligence calls you'd run before
              cutting a cheque.
            </p>
          </ColophonBlock>

          <ColophonBlock label="What it isn't">
            <p>
              A rating, a tax-deductibility guarantee, or an exhaustive list of every aligned
              organization. Filings lag, and quiet nonprofits will look quieter here than they are
              in real life.
            </p>
          </ColophonBlock>
        </div>
      </details>
    </section>
  );
}

function ColophonBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="max-w-[44ch]">
      <p
        className={`${briefDisplay.className} text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground`}
      >
        {label}
      </p>
      <div
        className={`${briefProse.className} mt-2 text-[0.9375rem] leading-[1.6] text-foreground/80`}
      >
        {children}
      </div>
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
