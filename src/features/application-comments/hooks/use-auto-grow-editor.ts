import { type RefObject, useEffect, useState } from "react";

const EDITOR_SELECTOR = ".md-editor";
const CONTENT_SELECTOR = ".md-editor .cm-content";
const SCROLLER_SELECTOR = ".md-editor .cm-scroller";

const VIEWPORT_MAX_RATIO = 0.4;
const SETTLE_TOLERANCE_PX = 1;

export interface AutoGrowOptions {
  minHeight: number;
  maxHeight?: number;
  enabled?: boolean;
}

export function resolveMaxHeight(maxHeight: number | undefined, viewportHeight: number): number {
  return maxHeight ?? Math.round(viewportHeight * VIEWPORT_MAX_RATIO);
}

/**
 * CodeMirror stretches `.cm-content` to fill its scroller, so its box height
 * never shrinks below the editor. The line span is the real text height; the
 * box height only wins once the document overflows the scroller.
 */
function measureTextHeight(content: HTMLElement, scroller: HTMLElement): number {
  if (content.offsetHeight > scroller.clientHeight) return content.offsetHeight;
  const lines = content.querySelectorAll<HTMLElement>(".cm-line");
  const first = lines[0];
  const last = lines[lines.length - 1];
  if (!first || !last) return content.offsetHeight;
  const style = window.getComputedStyle(content);
  const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  return last.getBoundingClientRect().bottom - first.getBoundingClientRect().top + padding;
}

export function clampEditorHeight(contentHeight: number, min: number, max: number): number {
  return Math.min(Math.max(contentHeight, min), Math.max(max, min));
}

/**
 * Tracks the rendered content height of the md-editor-rt CodeMirror instance
 * mounted inside `containerRef` and returns the editor height that fits it,
 * bounded by `minHeight` and `maxHeight` (defaults to 40% of the viewport).
 * Past the cap the editor keeps scrolling internally.
 */
export function useAutoGrowEditor(
  containerRef: RefObject<HTMLElement | null>,
  { minHeight, maxHeight, enabled = true }: AutoGrowOptions
): number {
  const [height, setHeight] = useState(minHeight);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    let contentObserver: ResizeObserver | null = null;

    const measure = () => {
      const editor = container.querySelector<HTMLElement>(EDITOR_SELECTOR);
      const content = container.querySelector<HTMLElement>(CONTENT_SELECTOR);
      const scroller = container.querySelector<HTMLElement>(SCROLLER_SELECTOR);
      if (!editor || !content || !scroller) return;
      const chrome =
        editor.offsetHeight -
        scroller.offsetHeight +
        (scroller.scrollHeight - content.offsetHeight);
      const max = resolveMaxHeight(maxHeight, window.innerHeight);
      const next = Math.round(
        clampEditorHeight(measureTextHeight(content, scroller) + chrome, minHeight, max)
      );
      setHeight((prev) => (Math.abs(prev - next) <= SETTLE_TOLERANCE_PX ? prev : next));
    };

    const attach = () => {
      const content = container.querySelector<HTMLElement>(CONTENT_SELECTOR);
      if (!content || contentObserver) return false;
      contentObserver = new ResizeObserver(measure);
      contentObserver.observe(content);
      measure();
      return true;
    };

    const mountObserver = new MutationObserver(() => {
      if (attach()) mountObserver.disconnect();
    });
    if (!attach()) {
      mountObserver.observe(container, { childList: true, subtree: true });
    }

    window.addEventListener("resize", measure);
    return () => {
      mountObserver.disconnect();
      contentObserver?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, minHeight, maxHeight, enabled]);

  return height;
}
