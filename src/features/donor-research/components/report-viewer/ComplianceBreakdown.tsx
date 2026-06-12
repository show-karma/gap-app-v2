"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ComplianceCheck, ComplianceCheckStatus } from "@/types/donor-research";

interface ComplianceBreakdownProps {
  checks: readonly ComplianceCheck[];
  /** Whether the disclosure starts open. Top-3 cards open by default; full list collapsed. */
  defaultOpen?: boolean;
}

/**
 * Surfaces the per-check evidence behind a candidate's compliance
 * verdict (Task B / KTD10 transparency mandate).
 *
 * Each check renders as a row: status glyph + label + one-line detail
 * with the underlying year / status / sync timestamp. Reads as a
 * receipt — "here is exactly what we checked and what we found" —
 * rather than a verdict declaration. Calmly typographic, no alarm
 * colors.
 */
export function ComplianceBreakdown({ checks, defaultOpen = false }: ComplianceBreakdownProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (checks.length === 0) return null;

  const failedCount = checks.filter((c) => c.status === "failed").length;
  const passedCount = checks.filter((c) => c.status === "passed").length;
  const summary =
    failedCount > 0
      ? `${failedCount} failed · ${passedCount} passed`
      : `${passedCount} of ${checks.length} checks passed`;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="group/cb border-t border-border/60"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 pt-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ChevronDown
            className="h-3 w-3 transition-transform group-open/cb:rotate-180"
            aria-hidden
          />
          Compliance breakdown
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground/80">{summary}</span>
      </summary>

      <dl className="mt-3 divide-y divide-border/60 overflow-hidden rounded-md border border-border/60 bg-background/50">
        {checks.map((check) => (
          <div
            key={check.name}
            className="grid grid-cols-[1.5rem_1fr] items-baseline gap-x-2 px-3 py-2.5"
          >
            <span className="row-span-2 mt-0.5" aria-hidden>
              <StatusGlyph status={check.status} />
            </span>
            <dt className="text-[13px] font-medium leading-tight text-foreground">{check.label}</dt>
            <dd className="col-start-2 mt-0.5 text-[12px] leading-snug text-muted-foreground">
              {check.detail}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function StatusGlyph({ status }: { status: ComplianceCheckStatus }) {
  if (status === "passed") {
    return (
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand/15 text-brand-emphasis dark:text-brand-subtle"
        title="Passed"
      >
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" aria-hidden>
          <path
            d="M3 8.5l3 3 7-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400"
        title="Failed"
      >
        <svg viewBox="0 0 16 16" className="h-2 w-2" aria-hidden>
          <path
            d="M4 4l8 8M12 4l-8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  if (status === "not_applicable") {
    return (
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground/70"
        title="Not applicable"
      >
        <span className="h-px w-2 bg-current" aria-hidden />
      </span>
    );
  }
  // unknown
  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground/70"
      title="Unknown"
    >
      <span className="text-[9px] font-semibold leading-none">?</span>
    </span>
  );
}
