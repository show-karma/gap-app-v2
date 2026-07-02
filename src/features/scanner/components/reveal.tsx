"use client";

import { type ElementType, useEffect, useRef, useState } from "react";

interface RevealProps {
  readonly children: React.ReactNode;
  // Stagger offset in ms, applied as a transition-delay so siblings can
  // cascade (e.g. delay={i * 80}).
  readonly delay?: number;
  readonly className?: string;
  // Semantic wrapper element — defaults to a div.
  readonly as?: ElementType;
}

// Scroll-triggered entrance: fades + lifts its children into place the first
// time they enter the viewport. The whole app requires JS (wallet auth), so
// gating visibility on the observer is safe here. Honours prefers-reduced-
// motion by rendering fully visible with no transition. Children stay in the
// DOM throughout, so the transform is purely visual.
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setInstant(true);
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      // Reveal a touch before fully in view; above-the-fold nodes intersect on
      // first observe and reveal immediately on mount.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${className} ${
        instant
          ? ""
          : `transition-[opacity,transform] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            }`
      }`}
      style={instant || delay === 0 ? undefined : { transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
