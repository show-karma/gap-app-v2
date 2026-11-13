"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { forwardRef } from "react";
import { usePrefetchOnIntent } from "./usePrefetchOnIntent";

export type IntentPrefetchLinkProps = Omit<ComponentProps<typeof NextLink>, "prefetch">;

/**
 * `next/link` that prefetches only once the visitor shows intent (hover, focus
 * or touch). Use it for links repeated in dense grids, such as project and
 * community cards; see `usePrefetchOnIntent` for why.
 */
export const IntentPrefetchLink = forwardRef<HTMLAnchorElement, IntentPrefetchLinkProps>(
  ({ onMouseEnter, onFocus, onTouchStart, ...props }, ref) => {
    const intent = usePrefetchOnIntent({ onMouseEnter, onFocus, onTouchStart });
    return <NextLink ref={ref} {...props} {...intent} />;
  }
);

IntentPrefetchLink.displayName = "IntentPrefetchLink";
