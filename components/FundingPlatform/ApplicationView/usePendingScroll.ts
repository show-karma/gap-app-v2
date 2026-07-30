"use client";

import { useEffect } from "react";

export const APPLICATION_DETAILS_ANCHOR_ID = "application-details";
export const ACTIVITY_TIMELINE_ANCHOR_ID = "activity-timeline";

export type ScrollAnchorId =
  | typeof APPLICATION_DETAILS_ANCHOR_ID
  | typeof ACTIVITY_TIMELINE_ANCHOR_ID;

export interface PendingScrollProps {
  /** Anchor the container hook wants scrolled into view once it exists. */
  pendingScrollAnchorId?: ScrollAnchorId | null;
  /** Clears the request so it fires once per navigation. */
  onPendingScrollHandled?: () => void;
}

/**
 * Consumes a pending scroll request from the component that renders `anchorId`.
 * Cross-tab navigation unmounts the target, so scheduling the scroll from the
 * click handler races the mount; running it from the owner's effect does not.
 */
export function usePendingScroll(
  anchorId: ScrollAnchorId,
  { pendingScrollAnchorId, onPendingScrollHandled }: PendingScrollProps
): void {
  useEffect(() => {
    if (pendingScrollAnchorId !== anchorId) return;
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    onPendingScrollHandled?.();
  }, [anchorId, pendingScrollAnchorId, onPendingScrollHandled]);
}
