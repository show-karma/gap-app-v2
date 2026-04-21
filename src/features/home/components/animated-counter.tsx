"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/utilities/tailwind";

interface AnimatedCounterProps {
  /** The target value to count to (e.g. "30", "4000", "50000") */
  value: string;
  /** Suffix to append after the number (e.g. "+", "k+", "hrs") */
  suffix?: string;
  /** Prefix to prepend (e.g. "$") */
  prefix?: string;
  /** Duration of the count animation in ms */
  duration?: number;
  className?: string;
}

/**
 * Parses a display string like "4,000+" into a numeric value and suffix.
 */
function parseDisplayValue(display: string): { num: number; suffix: string } {
  const match = display.match(/^([\d,]+)(.*)/);
  if (!match) return { num: 0, suffix: display };
  const num = Number.parseInt(match[1].replace(/,/g, ""), 10);
  const suffix = match[2] || "";
  return { num, suffix };
}

/**
 * Formats a number with commas for display.
 */
function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function AnimatedCounter({
  value,
  suffix: explicitSuffix,
  prefix = "",
  duration = 1800,
  className,
}: AnimatedCounterProps) {
  const { num: target, suffix: parsedSuffix } = parseDisplayValue(value);
  const suffix = explicitSuffix ?? parsedSuffix;
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setCount(target);
      setHasStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }

    const startTime = performance.now();
    let rafId: number;

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-expo curve
      const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [hasStarted, target, duration]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {formatNumber(count)}
      {suffix}
    </span>
  );
}
