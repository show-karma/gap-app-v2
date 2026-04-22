"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/utilities/tailwind";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Delay in ms before the animation starts after entering viewport */
  delay?: number;
  /** Animation variant */
  variant?: "fade-up" | "fade-in" | "fade-left" | "fade-right" | "scale-up";
  /** Duration in ms */
  duration?: number;
  /** How much of the element must be visible to trigger (0-1) */
  threshold?: number;
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  variant = "fade-up",
  duration = 700,
  threshold = 0.15,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Add revealed class after delay
            setTimeout(() => {
              el.classList.add("scroll-revealed");
            }, delay);
            observer.unobserve(el);
          }
        }
      },
      { threshold, rootMargin: "0px 0px 600px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  return (
    <div
      ref={ref}
      className={cn("scroll-reveal", `scroll-reveal--${variant}`, className)}
      style={
        {
          "--reveal-duration": `${duration}ms`,
          "--reveal-delay": `${delay}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

/**
 * Wraps children in staggered scroll reveals.
 * Each child gets an increasing delay for a cascade effect.
 */
interface StaggerRevealProps {
  children: ReactNode[];
  className?: string;
  variant?: ScrollRevealProps["variant"];
  /** Delay between each child in ms */
  stagger?: number;
  /** Base delay before the first child */
  baseDelay?: number;
  /** Wrapper element class for each child */
  itemClassName?: string;
}

export function StaggerReveal({
  children,
  className,
  variant = "fade-up",
  stagger = 100,
  baseDelay = 0,
  itemClassName,
}: StaggerRevealProps) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <ScrollReveal
          key={i}
          variant={variant}
          delay={baseDelay + i * stagger}
          className={itemClassName}
        >
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
}
