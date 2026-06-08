"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

/**
 * Donor-friendly scoring explainer (U14). Collapsed by default — donors
 * don't need the breakdown to understand the recommendations; expanding
 * is for advisors-of-advisors or curious donors.
 */
export function ScoringLegend() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-4 rounded-md border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium hover:bg-muted/30"
        aria-expanded={open}
        aria-controls="scoring-legend-details"
      >
        <span>How these recommendations are scored</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open ? (
        <div
          id="scoring-legend-details"
          className="border-t border-border px-4 py-3 text-sm text-muted-foreground"
        >
          <ul className="flex flex-col gap-2">
            <li>
              <strong className="text-foreground">Freshness</strong> — recent activity from the
              organization's own channels (website, social) in the last 60–90 days.
            </li>
            <li>
              <strong className="text-foreground">Impact recency</strong> — whether the organization
              is publishing substantive work, not just administrative posts.
            </li>
            <li>
              <strong className="text-foreground">Alignment</strong> — how closely the organization
              matches the cause, geography, and focus areas your advisor researched.
            </li>
            <li>
              <strong className="text-foreground">Compliance</strong> — verified nonprofit standing
              (IRS Pub 78, state registration where applicable, recent 990 filings).
            </li>
          </ul>
        </div>
      ) : null}
    </section>
  );
}
