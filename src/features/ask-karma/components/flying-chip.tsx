"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utilities/tailwind";

export interface FlyingChipRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface FlyingChipProps {
  text: string;
  startRect: FlyingChipRect;
  endRect: FlyingChipRect;
  durationMs: number;
  onArrive: () => void;
}

/**
 * Renders a chip clone via a body portal that animates from `startRect` to
 * `endRect` over `durationMs`. The clone fades out during the back half of
 * the flight so the input it lands on can take over the visual.
 *
 * Two RAFs before flipping to the end position so the start position commits
 * to the layout — without the double RAF, the browser collapses both styles
 * into one paint and skips the transition.
 */
export function FlyingChip({ text, startRect, endRect, durationMs, onArrive }: FlyingChipProps) {
  const [phase, setPhase] = useState<"start" | "end">("start");
  const arrivedRef = useRef(false);

  useLayoutEffect(() => {
    let raf2: number | null = null;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPhase("end"));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    if (phase !== "end") return;
    const timer = setTimeout(() => {
      if (arrivedRef.current) return;
      arrivedRef.current = true;
      onArrive();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [phase, durationMs, onArrive]);

  if (typeof document === "undefined") return null;

  const isAtEnd = phase === "end";
  // Land at the input's left edge with a 12px pad so the chip aligns with
  // where the first typed character will appear, and vertically center it
  // relative to the input.
  const target: FlyingChipRect = isAtEnd
    ? {
        left: endRect.left + 12,
        top: endRect.top + (endRect.height - startRect.height) / 2,
        width: Math.max(40, Math.min(startRect.width * 0.85, endRect.width - 24)),
        height: startRect.height,
      }
    : startRect;

  return createPortal(
    <div
      aria-hidden="true"
      data-testid="ask-karma-flying-chip"
      className={cn(
        "pointer-events-none fixed z-[9999] flex items-center overflow-hidden whitespace-nowrap",
        "rounded-full border border-[rgb(var(--color-primary))]/40 bg-[rgb(var(--color-primary))]/5 px-3.5 py-1.5",
        "text-sm font-medium text-zinc-900 shadow-lg shadow-[rgb(var(--color-primary))]/30",
        "dark:border-[rgb(var(--color-primary-dark))] dark:bg-[rgb(var(--color-primary-dark))]/50 dark:text-zinc-50 dark:shadow-[rgb(var(--color-primary-dark))]/30"
      )}
      style={{
        left: target.left,
        top: target.top,
        width: target.width,
        height: target.height,
        opacity: isAtEnd ? 0 : 1,
        transform: isAtEnd ? "scale(0.92)" : "scale(1)",
        // The position/size animates over the full duration; opacity fades in
        // the back 60% so the chip is fully visible during the launch and
        // dissolves as it lands on the input.
        transition: [
          `left ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          `top ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          `width ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          `opacity ${Math.round(durationMs * 0.6)}ms ease-out ${Math.round(durationMs * 0.4)}ms`,
        ].join(", "),
      }}
    >
      <span className="truncate">{text}</span>
    </div>,
    document.body
  );
}
