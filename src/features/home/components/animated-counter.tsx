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
 * Parses a display string into its numeric target, magnitude, and trailing suffix.
 * Examples: "4,000+" → { num: 4000, magnitude: "", suffix: "+" },
 *           "50k+"   → { num: 50000, magnitude: "k", suffix: "+" },
 *           "1.2M"   → { num: 1200000, magnitude: "M", suffix: "" }.
 */
function parseDisplayValue(display: string): {
  num: number;
  magnitude: string;
  suffix: string;
} {
  const match = display.match(/^([\d,]+(?:\.\d+)?)\s*([kKmMbB]?)(.*)$/);
  if (!match) return { num: 0, magnitude: "", suffix: display };
  const base = Number.parseFloat(match[1].replace(/,/g, ""));
  const magnitude = match[2] || "";
  const multiplier =
    magnitude.toLowerCase() === "k"
      ? 1_000
      : magnitude.toLowerCase() === "m"
        ? 1_000_000
        : magnitude.toLowerCase() === "b"
          ? 1_000_000_000
          : 1;
  return {
    num: Math.round(base * multiplier),
    magnitude,
    suffix: match[3] || "",
  };
}

/**
 * Formats a number for display. When a magnitude suffix was present in the
 * source string (k/M/B), uses compact notation so the animated count stays in
 * the same visual family (e.g. "50k" rather than "50,000").
 */
function formatNumber(n: number, magnitude: string): string {
  if (magnitude) {
    const divisor =
      magnitude.toLowerCase() === "k"
        ? 1_000
        : magnitude.toLowerCase() === "m"
          ? 1_000_000
          : magnitude.toLowerCase() === "b"
            ? 1_000_000_000
            : 1;
    const scaled = n / divisor;
    // Preserve the original magnitude casing (e.g. "50k" vs "1.2M").
    const display =
      scaled >= 10 || Number.isInteger(scaled) ? Math.round(scaled).toString() : scaled.toFixed(1);
    return `${display}${magnitude}`;
  }
  return n.toLocaleString("en-US");
}

export function AnimatedCounter({
  value,
  suffix: explicitSuffix,
  prefix = "",
  duration = 1800,
  className,
}: AnimatedCounterProps) {
  const { num: target, magnitude, suffix: parsedSuffix } = parseDisplayValue(value);
  const suffix = explicitSuffix ?? parsedSuffix;
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      {formatNumber(count, magnitude)}
      {suffix}
    </span>
  );
}
