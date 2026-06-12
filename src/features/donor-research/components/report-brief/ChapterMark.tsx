"use client";

import { briefDisplay } from "./fonts";

interface ChapterMarkProps {
  number: string;
  label: string;
  /** Tints the chapter label. `lead` gets the only brand-coloured label in the whole brief. */
  tone?: "lead" | "runner-up" | "section";
}

/**
 * Numbered chapter marker. Sets a typographic horizon for each
 * section: an outsized display number on the left, a fine rule
 * running across the column, and a small-caps label tucked at the
 * right end. The number is decorative — the surrounding section
 * provides the real heading semantics.
 */
export function ChapterMark({ number, label, tone = "section" }: ChapterMarkProps) {
  const labelTone =
    tone === "lead"
      ? "text-brand-emphasis dark:text-brand-subtle"
      : tone === "runner-up"
        ? "text-foreground/70"
        : "text-muted-foreground";
  return (
    <div className="flex items-end gap-5 pb-3 sm:gap-7">
      <span
        aria-hidden
        className={`${briefDisplay.className} block text-[clamp(3rem,7vw,5rem)] font-light leading-[0.82] tabular-nums tracking-[-0.04em] text-foreground`}
      >
        {number}
      </span>
      <span aria-hidden className="h-px flex-1 self-end bg-border mb-3" />
      <span
        className={`${briefDisplay.className} pb-2 text-[10px] font-medium uppercase tracking-[0.32em] sm:text-[11px] ${labelTone}`}
      >
        {label}
      </span>
    </div>
  );
}
