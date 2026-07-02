"use client";

import { useEffect, useState } from "react";

interface ScoreGaugeProps {
  readonly score: number;
  readonly size?: number;
}

const TICKS = 64;
const CENTER = 100;
const INNER = 74;
const OUTER = 92;

// A radial tick dial: 64 hairline ticks around a circle, filled up to the score.
// Always the brand accent — severity lives in the grade chip and label text,
// not the dial. Animates the fill + the centre number from 0 in ~1.1s (snaps
// under prefers-reduced-motion).
export function ScoreGauge({ score, size = 184 }: ScoreGaugeProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setProgress(1);
      return;
    }
    const duration = 1100;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      setProgress(1 - (1 - k) ** 3);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const filled = Math.round(progress * (score / 100) * TICKS);
  const shown = Math.round(progress * score);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="block"
        role="img"
        aria-label={`Score ${Math.round(score)} of 100`}
      >
        {Array.from({ length: TICKS }, (_, i) => {
          const ang = (i / TICKS) * 2 * Math.PI - Math.PI / 2;
          const on = i < filled;
          return (
            // Each tick's angle is unique and stable, so it doubles as the key.
            <line
              key={ang}
              x1={CENTER + Math.cos(ang) * INNER}
              y1={CENTER + Math.sin(ang) * INNER}
              x2={CENTER + Math.cos(ang) * OUTER}
              y2={CENTER + Math.sin(ang) * OUTER}
              strokeWidth={2.6}
              strokeLinecap="round"
              className={on ? "stroke-brand" : "stroke-border opacity-60"}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-semibold leading-none tracking-tight text-foreground tabular-nums"
          style={{ fontSize: size * 0.31 }}
        >
          {shown}
        </span>
        <span
          className="mt-1.5 font-medium uppercase tracking-[0.08em] text-muted-foreground"
          style={{ fontSize: size * 0.075 }}
        >
          out of 100
        </span>
      </div>
    </div>
  );
}
