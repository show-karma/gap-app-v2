"use client";

/**
 * The landing page shares the section error boundary. The `(landing-nav)` group
 * moved `page.tsx` one directory down, and the route-trio rule wants `error.tsx`
 * in the page directory itself, so this re-exports the section boundary rather
 * than duplicating it. Behaviour is unchanged: the same component caught the
 * same errors before the split.
 */
export { default } from "../error";
