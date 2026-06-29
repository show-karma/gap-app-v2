"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/utilities/tailwind";

interface RotatingWordProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

/**
 * Rotates through `words` in a fixed-width slot.
 *
 * Layout: an invisible copy of the longest word sits in normal flow to reserve
 * the slot's exact rendered width (so the rest of the H1 never reflows) and to
 * establish the baseline. The visible words overlay it absolutely, pinned to
 * the bottom edge — same font + line-height as the spacer, so their text
 * baseline lines up with the surrounding sentence — and centered, so the slack
 * for shorter words splits evenly instead of opening one ragged gap.
 *
 * Accessibility: the element is aria-hidden (visual decoration) and honors
 * prefers-reduced-motion by holding on the first word. Callers must provide the
 * full canonical sentence in a sibling `sr-only` span for screen readers / SEO.
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

  const longest = useMemo(
    () => words.reduce((max, word) => (word.length > max.length ? word : max), ""),
    [words]
  );

  return (
    <span aria-hidden className="relative inline-block align-baseline whitespace-nowrap">
      <span className="invisible">{longest}</span>
      {words.map((word, i) => (
        <span
          key={word}
          className={cn(
            "absolute inset-x-0 bottom-0 text-center",
            !reduceMotion && "transition-opacity duration-500 ease-out",
            i === index ? "opacity-100" : "opacity-0 pointer-events-none",
            className
          )}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
