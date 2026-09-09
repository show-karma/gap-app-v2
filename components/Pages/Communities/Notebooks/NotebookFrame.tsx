"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NOTEBOOK_SANDBOX } from "@/utilities/notebooks/sandbox";

/**
 * The sandbox attribute is a constant (`utilities/notebooks/sandbox.ts`), not
 * a prop, so no caller can widen it. Two consequences of `allow-scripts` alone
 * that this file works around: `localStorage` *throws* inside the frame, and
 * messages it posts arrive with `event.origin === "null"`, which makes an
 * origin check useless — identity has to come from `event.source` instead.
 */

/**
 * Fallback height until the notebook reports its own. Tall enough that a
 * dashboard is usable if it never reports, short enough not to leave a page of
 * whitespace under a small one.
 */
const DEFAULT_HEIGHT_PX = 1200;
const MIN_HEIGHT_PX = 320;
const MAX_HEIGHT_PX = 20000;

/**
 * How long to wait for the frame's `load` before showing the error state.
 *
 * An iframe's `onError` is nearly useless as a failure signal: it does not fire
 * for an HTTP 404 or 500 — the browser simply renders the server's error page
 * inside the frame — and an opaque origin makes the frame's own state
 * unreadable from here. A timeout is the only failure signal the host actually
 * has. 15s matches the mid-tier-mobile cold-start budget, so a slow-but-working
 * notebook is not called broken. The clock starts when the frame is mounted,
 * not when the page renders, because the frame is mounted lazily.
 */
const LOAD_TIMEOUT_MS = 15_000;

/**
 * How far below the viewport the frame starts loading. The bundle's static
 * preview paints within a couple of seconds, but Pyodide then boots for ten
 * seconds or more of CPU; a notebook below the fold must not spend that while
 * the page above it is still settling.
 */
const MOUNT_ROOT_MARGIN = "600px 0px";

interface NotebookHeightMessage {
  type: "notebook:height";
  height: number;
}

function isHeightMessage(data: unknown): data is NotebookHeightMessage {
  if (typeof data !== "object" || data === null) return false;
  const message = data as Record<string, unknown>;
  return (
    message.type === "notebook:height" &&
    typeof message.height === "number" &&
    Number.isFinite(message.height)
  );
}

interface NotebookFrameProps {
  /** Absolute https URL of the published bundle, already allowlisted by the caller. */
  src: string;
  /** Accessible name for the frame — the notebook's own title. */
  title: string;
}

/**
 * Sandboxed viewer for a published notebook bundle.
 *
 * Deliberately takes no `sandbox` prop: the attribute is a constant, so no
 * caller can widen it.
 */
export function NotebookFrame({ src, title }: NotebookFrameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT_PX);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasErrored, setHasErrored] = useState(false);

  // Mount the frame when its slot comes near the viewport. Without
  // IntersectionObserver (older browsers, test environments) mount at once:
  // a notebook that never appears is worse than one that loads early.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setIsMounted(true);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: MOUNT_ROOT_MARGIN }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // The frame is on an opaque origin, so `event.origin` is the string
      // "null" for every message it sends — indistinguishable from any other
      // sandboxed frame on the page. Identity therefore comes from the source
      // window being *this* iframe's contentWindow, which cannot be forged by
      // another frame.
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      if (!isHeightMessage(event.data)) return;

      setHeight(Math.min(Math.max(event.data.height, MIN_HEIGHT_PX), MAX_HEIGHT_PX));
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // The frame either loads within the budget or is reported as failed. A
  // notebook that loads and then throws renders its OWN error state inside the
  // frame — that is not observable from here across an opaque origin, and it is
  // not this component's job.
  useEffect(() => {
    if (!isMounted || isLoaded) return;
    const timer = setTimeout(() => setHasErrored(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isMounted, isLoaded]);

  const onLoad = useCallback(() => {
    setIsLoaded(true);
    setHasErrored(false);
  }, []);

  const onError = useCallback(() => {
    setHasErrored(true);
  }, []);

  if (hasErrored) {
    return <NotebookFrameError title={title} />;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-background"
      data-testid="notebook-frame-slot"
    >
      {!isLoaded ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background"
          data-testid="notebook-frame-loading"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading notebook…</p>
        </div>
      ) : null}
      {isMounted ? (
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          sandbox={NOTEBOOK_SANDBOX}
          onLoad={onLoad}
          onError={onError}
          loading="lazy"
          className="w-full border-0"
          style={{ height: `${height}px` }}
        />
      ) : (
        <div style={{ height: `${height}px` }} aria-hidden="true" />
      )}
    </div>
  );
}

function NotebookFrameError({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <p className="text-base font-medium text-foreground">This notebook could not be loaded</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {title} is temporarily unavailable. Try reloading the page.
      </p>
    </div>
  );
}
