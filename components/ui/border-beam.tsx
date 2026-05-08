"use client";
import type * as React from "react";
import { cn } from "@/utilities/tailwind";

interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
  style?: React.CSSProperties;
  reverse?: boolean;
  initialOffset?: number;
  borderWidth?: number;
}

export const BorderBeam = ({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1,
}: BorderBeamProps) => {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
      style={{ borderWidth: `${borderWidth}px` }}
    >
      <div
        className={cn(
          "absolute aspect-square bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent",
          reverse ? "animate-border-beam-reverse" : "animate-border-beam",
          className
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            offsetDistance: `${initialOffset}%`,
            animationDuration: `${duration}s`,
            animationDelay: `${-delay}s`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
            "--initial-offset": `${initialOffset}%`,
            "--reverse-start": `${100 - initialOffset}%`,
            "--reverse-end": `${-initialOffset}%`,
            "--forward-end": `${100 + initialOffset}%`,
            ...style,
          } as React.CSSProperties
        }
      />
    </div>
  );
};
