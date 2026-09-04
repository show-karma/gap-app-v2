"use client";

/**
 * The section index shares the section error boundary. The `(public)` group
 * moved `page.tsx` one directory down and the route-trio rule wants
 * `error.tsx` in the page directory, so this re-exports it rather than
 * duplicating it.
 */
export { default } from "../error";
