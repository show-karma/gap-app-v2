"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Preserves the `?scrollTo=<sectionId>` deep-link behaviour now that the About
 * content is server-rendered. Renders nothing; only smooth-scrolls to the
 * target section once it is present in the DOM.
 *
 * Must be wrapped in <Suspense> by the caller — useSearchParams() otherwise
 * forces the whole route to bail out of server rendering.
 */
export function AboutScrollHandler() {
  const searchParams = useSearchParams();
  const scrollTo = searchParams.get("scrollTo");

  useEffect(() => {
    if (!scrollTo) return;

    const timeoutId = setTimeout(() => {
      const element = document.getElementById(scrollTo);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [scrollTo]);

  return null;
}
