"use client";

import { type RefObject, useLayoutEffect } from "react";

/**
 * Grow a textarea to fit its content (up to its CSS max-height, then it
 * scrolls). Re-runs whenever `value` changes — including the reset to "" after
 * submit, which collapses it back to a single row.
 *
 * Shared by the Ask Karma start-screen and in-chat inputs so the auto-grow
 * behaviour lives in one place.
 */
export function useAutoGrowTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string
): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}
