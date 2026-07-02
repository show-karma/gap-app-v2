"use client";

import { ChevronDown, Wrench, Zap } from "lucide-react";
import pluralize from "pluralize";
import { useState } from "react";
import type { ScanFix } from "../types";

interface TopFixesListProps {
  readonly fixes: readonly ScanFix[];
  // Current total score, so each rung can show the cumulative score after the
  // fix is applied. Defaults to 0 if unknown.
  readonly startScore?: number | null;
}

// "Path to 100" — the prioritized fixes as a score ladder. Each rung shows the
// score you'd reach after that fix (ordered by impact), and expands to the
// how-to-fix guidance.
export function TopFixesList({ fixes, startScore }: TopFixesListProps) {
  const [openId, setOpenId] = useState<string | null>(fixes[0]?.checkId ?? null);

  if (fixes.length === 0) {
    return null;
  }

  const total = fixes.reduce((sum, f) => sum + f.pointsAtStake, 0);
  let running = startScore ?? 0;
  const rungs = fixes.map((fix) => {
    running = Math.min(100, running + fix.pointsAtStake);
    return { fix, to: running };
  });

  return (
    <section id="path-to-100" className="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <Zap className="h-5 w-5 text-brand-emphasis" aria-hidden />
          <h2 className="text-xl font-bold tracking-tight text-foreground">Path to 100</h2>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          {fixes.length} {pluralize("fix", fixes.length)}, +{total} {pluralize("point", total)}.
          Each rung shows your score after that fix — ordered by impact, so start at the top.
        </p>
      </div>

      {/* starting node */}
      <div className="relative pl-[66px]">
        <div className="absolute -bottom-3.5 left-[27px] top-8 w-0.5 bg-border" aria-hidden />
        <div className="absolute left-0 top-0 grid h-[34px] w-[54px] place-items-center rounded-[10px] bg-foreground text-[14.5px] font-bold tabular-nums text-background">
          {startScore ?? 0}
        </div>
        <p className="pt-1.5 text-[13px] text-muted-foreground">Today's score</p>
      </div>

      {rungs.map((rung, i) => (
        <LadderRung
          key={rung.fix.checkId}
          fix={rung.fix}
          to={rung.to}
          last={i === rungs.length - 1}
          open={openId === rung.fix.checkId}
          onToggle={() => setOpenId(openId === rung.fix.checkId ? null : rung.fix.checkId)}
        />
      ))}
    </section>
  );
}

function LadderRung({
  fix,
  to,
  last,
  open,
  onToggle,
}: {
  readonly fix: ScanFix;
  readonly to: number;
  readonly last: boolean;
  readonly open: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <div className="relative pl-[66px]">
      {!last ? (
        <div className="absolute -bottom-1.5 left-[27px] top-11 w-0.5 bg-border" aria-hidden />
      ) : null}
      <div
        className={`absolute left-0 top-1.5 z-[1] grid h-[34px] w-[54px] place-items-center rounded-[10px] text-[14.5px] font-bold tabular-nums shadow-sm ${
          to >= 100 ? "bg-brand text-brand-950" : "border border-border bg-card text-foreground"
        }`}
      >
        {to}
      </div>
      <div
        className={`overflow-hidden rounded-lg border bg-card transition-colors ${
          open ? "border-brand-subtle" : "border-border"
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        >
          <span className="flex-1 text-[15px] font-semibold leading-tight text-foreground">
            {fix.title}
          </span>
          <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand-emphasis">
            +{fix.pointsAtStake} {pluralize("pt", fix.pointsAtStake)}
          </span>
          <ChevronDown
            className={`h-[17px] w-[17px] shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
        {open ? (
          <div className="px-4 pb-4">
            <div className="rounded-lg bg-secondary p-3.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.05em] text-brand-emphasis">
                <Wrench className="h-3 w-3" aria-hidden /> How to fix
              </div>
              <p className="text-sm leading-relaxed text-foreground">{fix.howToFix}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
