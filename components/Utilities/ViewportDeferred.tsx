"use client";

import type { ReactNode } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

interface ViewportDeferredProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
}

/**
 * Mounts children only when their container is close to the viewport.
 * Keeps heavy sections out of the initial hydration path.
 */
export function ViewportDeferred({
  children,
  fallback = null,
  rootMargin = "200px 0px",
  threshold = 0.01,
}: ViewportDeferredProps) {
  const { isVisible, ref } = useIntersectionObserver({
    rootMargin,
    threshold,
    triggerOnce: true,
  });

  const shouldRender = process.env.NODE_ENV === "test" || isVisible;

  return <div ref={ref}>{shouldRender ? children : fallback}</div>;
}
