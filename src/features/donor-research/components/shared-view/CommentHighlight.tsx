"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ResolvedAnchor,
  resolveAnchor,
} from "@/src/features/donor-research/components/anchor/resolve";
import type { CommentAnchor } from "@/src/features/donor-research/components/anchor/types";

interface CommentHighlightProps {
  /** Anchor to resolve. Only text-range anchors render a highlight. */
  anchor: CommentAnchor;
  /** Root element used as the resolver search scope. */
  root: Element | null;
  /**
   * Bumps every time the resolved root payload changes — forces a
   * recompute when the report re-enriches and the DOM rewrites.
   */
  refreshKey?: string | number;
  /** Click handler — when supplied the highlight is interactive. */
  onActivate?: () => void;
  /**
   * True when this highlight's source comment is the currently
   * focused row in the sidebar. The highlight renders in a stronger
   * color so the donor can see which highlight a row maps to.
   */
  isActive?: boolean;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function collectRects(resolved: ResolvedAnchor): HighlightRect[] {
  if (resolved.kind !== "range") return [];
  const rects = resolved.range.getClientRects();
  // The Range API returns one rect per visual line so multi-line
  // highlights render correctly. Each rect is window-relative; we add
  // window scroll so the absolutely-positioned span lands in document
  // coordinates.
  const out: HighlightRect[] = [];
  for (let i = 0; i < rects.length; i += 1) {
    const r = rects[i];
    if (r.width <= 0 || r.height <= 0) continue;
    out.push({
      top: r.top + window.scrollY,
      left: r.left + window.scrollX,
      width: r.width,
      height: r.height,
    });
  }
  return out;
}

/**
 * Renders yellow highlight bands over the resolved text range of a
 * text-range anchor. Re-resolves on window resize and on `refreshKey`
 * changes (which is how SharedReportView signals a re-enriched report
 * payload). Section / candidate / orphan anchors render nothing — the
 * caller routes those to pins and the orphan lane respectively.
 */
export function CommentHighlight({
  anchor,
  root,
  refreshKey,
  onActivate,
  isActive = false,
}: CommentHighlightProps) {
  const [rects, setRects] = useState<HighlightRect[]>([]);

  const isTextRange = anchor.kind === "text_range";

  // biome-ignore lint/correctness/useExhaustiveDependencies: `refreshKey` triggers re-resolve.
  useEffect(() => {
    if (!isTextRange || !root || typeof window === "undefined") {
      setRects([]);
      return;
    }

    const compute = () => {
      const resolved = resolveAnchor(anchor, root);
      setRects(collectRects(resolved));
    };

    compute();

    const onResize = () => compute();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [anchor, root, refreshKey, isTextRange]);

  const elements = useMemo(() => {
    // Two visual states: idle (subtle yellow) vs active (stronger
    // amber + ring). Active = this highlight's source comment row
    // is currently focused in the sidebar, giving the donor a
    // visual rope between the comment and the highlighted text.
    const idleClass = "bg-amber-200/40 mix-blend-multiply dark:bg-amber-300/30";
    const activeClass =
      "bg-amber-300/70 mix-blend-multiply ring-2 ring-amber-500 dark:bg-amber-300/55 dark:ring-amber-400";

    // The highlight bands themselves are ALWAYS pointer-events: none so
    // they never intercept a mouse-down/drag — the donor must be able to
    // re-select previously-commented text to comment on (or overlap) it
    // again. The "view comment thread" interaction lives on a separate
    // marker badge rendered at the end of the range (see below), which
    // sits beside the text rather than on top of it.
    return rects.map((r) => {
      const style = {
        position: "absolute" as const,
        top: `${r.top}px`,
        left: `${r.left}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        pointerEvents: "none" as const,
      };
      return (
        <span
          key={`${r.top}:${r.left}:${r.width}:${r.height}`}
          aria-hidden
          data-comment-highlight
          data-active={isActive || undefined}
          style={style}
          className={`rounded-sm transition-colors ${isActive ? activeClass : idleClass}`}
        />
      );
    });
  }, [rects, isActive]);

  // A small clickable marker pinned to the end of the last highlight
  // rect. It does NOT cover the selectable text, so text remains
  // re-selectable, while still offering a click-to-open-thread target
  // and preserving the bidirectional highlight↔row focus emphasis.
  const marker = useMemo(() => {
    if (!onActivate) return null;
    const last = rects[rects.length - 1];
    if (!last) return null;
    const markerActiveClass =
      "bg-amber-500 text-white ring-2 ring-amber-300 dark:bg-amber-400 dark:ring-amber-500";
    const markerIdleClass =
      "bg-amber-300/80 text-amber-900 hover:bg-amber-400 dark:bg-amber-400/70 dark:text-amber-950 dark:hover:bg-amber-400";
    return (
      <button
        type="button"
        onClick={onActivate}
        aria-label="View comment thread"
        data-comment-marker
        data-active={isActive || undefined}
        style={{
          position: "absolute",
          top: `${last.top + last.height / 2 - 7}px`,
          left: `${last.left + last.width + 2}px`,
          width: "14px",
          height: "14px",
          pointerEvents: "auto",
        }}
        className={`z-20 inline-flex items-center justify-center rounded-full text-[9px] font-bold leading-none shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
          isActive ? markerActiveClass : markerIdleClass
        }`}
      >
        <span aria-hidden>≡</span>
      </button>
    );
  }, [rects, onActivate, isActive]);

  if (!isTextRange || rects.length === 0) return null;

  return (
    <>
      {elements}
      {marker}
    </>
  );
}
