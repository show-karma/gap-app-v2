"use client";

import { useEffect, useState } from "react";
import { cn } from "@/utilities/tailwind";

interface RotatingWordProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

export function RotatingWord({ words, intervalMs = 2400, className }: RotatingWordProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [words.length, intervalMs]);

  // Pin container width to the widest word so the rest of the H1 never
  // reflows mid-cycle. inline-grid stacks every word in the same cell;
  // the visible one fades in, the others sit hidden but still occupy
  // the column, so the column resolves to the widest word's width.
  return (
    <span
      aria-hidden
      className={cn("relative inline-grid align-baseline whitespace-nowrap", className)}
    >
      {words.map((word, i) => (
        <span
          key={word}
          className={cn(
            "col-start-1 row-start-1 transition-opacity duration-500 ease-out",
            i === index ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
