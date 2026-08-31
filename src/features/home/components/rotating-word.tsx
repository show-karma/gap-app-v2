"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/utilities/tailwind";

interface RotatingWordProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

/**
 * Rotates through `words` in a fixed-width slot.
 *
 * Layout: `inline-grid` stacks every word in the same cell (col/row 1), so the
 * slot resolves to the widest *rendered* word — character count is not a width
 * proxy in a proportional font, and `className` (e.g. `italic`) lives on the
 * container so every stacked word shares the metrics that set that width. Only
 * the active word is opaque; the rest stay in place at `opacity-0`, so the
 * surrounding H1 never reflows mid-cycle. `align-baseline` keeps the grid on the
 * sentence baseline; `justify-items-center` splits the slack for shorter words
 * evenly instead of opening one ragged gap.
 *
 * Accessibility: the element is aria-hidden (visual decoration) and honors
 * prefers-reduced-motion by holding on the first word with no transition.
 * Callers must provide the full canonical sentence in a sibling `sr-only` span
 * for screen readers / SEO.
 */
export function RotatingWord({ words, intervalMs = 2400, className }: RotatingWordProps) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion || words.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [reduceMotion, words.length, intervalMs]);

  // Clamp into range so a shrunk `words` list (e.g. n → 1 while index > 0)
  // can't leave every word hidden until the next tick.
  const activeIndex = words.length > 0 ? index % words.length : 0;

  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-grid justify-items-center align-baseline whitespace-nowrap",
        className
      )}
    >
      {words.map((word, i) => (
        <span
          key={word}
          className={cn(
            "col-start-1 row-start-1",
            !reduceMotion && "transition-opacity duration-500 ease-out",
            i === activeIndex ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
