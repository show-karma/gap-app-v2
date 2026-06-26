"use client";

import { useEffect, useState } from "react";
import type { ScanGrade } from "../types";
import { BAND_FG, GRADE_TAGLINE, type ScoreBand } from "../utils/labels";

interface ScoreHeroProps {
  readonly totalScore: number | null;
  readonly grade: ScanGrade | null;
  readonly orgName?: string | null;
  readonly url?: string | null;
  readonly scannedAt?: string | null;
}

// Animates 0 -> totalScore in ~700ms using ease-out-quint, then quiet.
// Honors prefers-reduced-motion by snapping to the final value.
function useAnimatedScore(target: number | null): number {
  const [value, setValue] = useState(target ?? 0);
  useEffect(() => {
    if (target === null) {
      setValue(0);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }
    const duration = 700;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - elapsed) ** 5;
      setValue(Math.round(target * eased * 10) / 10);
      if (elapsed < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

export function ScoreHero({ totalScore, grade, orgName, url, scannedAt }: ScoreHeroProps) {
  const animated = useAnimatedScore(totalScore);
  const taggedGrade = grade ? GRADE_TAGLINE[grade] : null;
  const colorClass: string = taggedGrade ? BAND_FG[taggedGrade.tone] : "text-zinc-700";
  const fmtScore = (v: number): string => {
    if (Number.isInteger(v)) {
      return String(v);
    }
    return v.toFixed(1);
  };

  return (
    <header className="flex flex-col gap-6">
      {orgName || url ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {orgName ? (
            <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              {orgName}
            </span>
          ) : null}
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          ) : null}
          {scannedAt ? (
            <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
              scanned{" "}
              {new Date(scannedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <div
            role="img"
            aria-label={totalScore !== null ? `Score ${totalScore} of 100` : "Score pending"}
            className="flex items-baseline gap-3"
          >
            <span
              className={`font-display text-[clamp(7rem,18vw,12rem)] leading-none tracking-tight ${colorClass}`}
              aria-hidden
            >
              {totalScore === null ? "--" : fmtScore(animated)}
            </span>
            <span className="font-mono text-2xl text-zinc-400 dark:text-zinc-500" aria-hidden>
              / 100
            </span>
          </div>
        </div>
        {grade && taggedGrade ? (
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className={`h-2 w-2 rounded-full ${BAND_DOT[taggedGrade.tone]}`} aria-hidden />
            <span className={`font-medium ${colorClass}`}>{taggedGrade.tag}</span>
            <span className="text-zinc-400 dark:text-zinc-500">grade {grade}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 font-mono text-sm text-zinc-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" aria-hidden />
            <span>Computing</span>
          </div>
        )}
      </div>
    </header>
  );
}

const BAND_DOT: Record<ScoreBand, string> = {
  strong: "bg-brand",
  ok: "bg-amber-500",
  weak: "bg-orange-500",
  critical: "bg-rose-500",
};
