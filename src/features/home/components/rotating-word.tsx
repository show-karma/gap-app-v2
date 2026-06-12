"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/utilities/tailwind";

interface RotatingWordProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

/**
 * Rotates through a list of words in a slot whose width is locked to the
 * longest word's exact rendered width (via an invisible same-typeface
 * spacer, not the loose ch unit). The active word is pinned to the right
 * edge so the gap collapses to the left and "worth backing" never moves.
 *
 * Accessibility: the rotating element is aria-hidden because it is visual
 * decoration. Callers must provide a complete sentence (covering every
 * variant) in a sibling `sr-only` span so screen readers and SEO get the
 * canonical text.
 */
export function RotatingWord({ words, intervalMs = 2400, className }: RotatingWordProps) {
  const [idx, setIdx] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (words.length < 2) return;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % words.length), intervalMs);
    return () => window.clearInterval(id);
  }, [words.length, intervalMs]);

  // The widest word in the list; rendered invisibly to reserve exact width.
  const longest = useMemo(
    () => words.reduce((max, w) => (w.length > max.length ? w : max), ""),
    [words]
  );

  const current = words[idx] ?? "";
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.6 };

  return (
    <span aria-hidden className="relative inline-block align-baseline whitespace-nowrap">
      {/* Spacer: invisible copy of the longest word. Sets the slot's exact
          rendered width and establishes the baseline. The active word
          overlays it; the slot itself never resizes. */}
      <span aria-hidden className="invisible">
        {longest}
      </span>
      {/* Active word pinned to the right edge so the gap collapses to the
          left side only. bottom-0 aligns its baseline with the spacer's
          baseline since both share font, size, and line-height. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={current}
          initial={reduceMotion ? { opacity: 1, y: 0 } : { y: "0.2em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 1, y: 0 } : { y: "-0.2em", opacity: 0 }}
          transition={transition}
          className={cn("absolute right-0 bottom-0 whitespace-nowrap", className)}
        >
          {current}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
