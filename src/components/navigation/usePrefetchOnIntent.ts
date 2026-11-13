"use client";

import type { FocusEvent, MouseEvent, TouchEvent } from "react";
import { useCallback, useState } from "react";

type IntentHandlers<E extends HTMLElement> = {
  onMouseEnter?: (event: MouseEvent<E>) => void;
  onFocus?: (event: FocusEvent<E>) => void;
  onTouchStart?: (event: TouchEvent<E>) => void;
};

/**
 * Defers a `<Link>`'s prefetch until the visitor shows intent: hovers it,
 * focuses it with the keyboard, or touches it.
 *
 * A grid of cards is the case this exists for. With the default `prefetch`,
 * every card that scrolls into view prefetches its route, and a project or
 * community page's shell depends on its URL params, so each of those prefetches
 * renders and stores one page on the server. On `/communities` and a community
 * hub that was 49 of the 56 pages written in a typical visit, none of which
 * were opened. This keeps the prefetch for the one card the visitor is about to
 * click (the pattern Next documents as "hover-triggered prefetch"), so the
 * navigation stays instant.
 *
 * Returns the `prefetch` value to pass to the Link plus the handlers to spread
 * on it. The handlers call the caller's own handlers too, so they can be
 * spread over existing ones.
 */
export function usePrefetchOnIntent<E extends HTMLElement = HTMLAnchorElement>(
  own: IntentHandlers<E> = {}
) {
  const [hasIntent, setHasIntent] = useState(false);
  const { onMouseEnter, onFocus, onTouchStart } = own;

  const handleMouseEnter = useCallback(
    (event: MouseEvent<E>) => {
      setHasIntent(true);
      onMouseEnter?.(event);
    },
    [onMouseEnter]
  );
  const handleFocus = useCallback(
    (event: FocusEvent<E>) => {
      setHasIntent(true);
      onFocus?.(event);
    },
    [onFocus]
  );
  const handleTouchStart = useCallback(
    (event: TouchEvent<E>) => {
      setHasIntent(true);
      onTouchStart?.(event);
    },
    [onTouchStart]
  );

  return {
    // `null` is the Link default ("auto"): once there is intent the card
    // prefetches exactly what it did before, and nothing until then.
    prefetch: hasIntent ? null : false,
    onMouseEnter: handleMouseEnter,
    onFocus: handleFocus,
    onTouchStart: handleTouchStart,
  } as const;
}
