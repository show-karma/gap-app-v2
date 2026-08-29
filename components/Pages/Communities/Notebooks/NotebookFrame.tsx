"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The ONLY sandbox token this frame may ever carry.
 *
 * The notebook bundle is served from gap-app-v2's own origin, so
 * `allow-same-origin` would hand tenant-authored JavaScript the app's real
 * origin — full DOM access, cookies, the Privy session. There is no
 * configuration in which adding it is acceptable under same-origin hosting;
 * it is not a fallback, it is a sandbox escape.
 *
 * `allow-scripts` alone leaves the frame on an opaque origin: no cookies, no
 * storage, no parent DOM. Two consequences the rest of this file works around:
 * `localStorage` *throws* inside the frame, and messages it posts arrive with
 * `event.origin === "null"`, which makes an origin check useless — identity
 * has to come from `event.source` instead.
 *
 * Exported so the invariant test asserts the same constant the component
 * renders. `__tests__/app/notebook-sandbox.test.tsx` additionally asserts the
 * RENDERED attribute, so a wrapper or sanitizer that rewrote it could not slip
 * past a source-level check.
 */
export const NOTEBOOK_SANDBOX = "allow-scripts" as const;

/** Forbidden tokens, named so the failure message says why. */
export const FORBIDDEN_SANDBOX_TOKENS = [
  "allow-same-origin",
  "allow-top-navigation",
  "allow-popups-to-escape-sandbox",
] as const;

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
 * notebook is not called broken.
 */
const LOAD_TIMEOUT_MS = 15_000;

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

export interface NotebookFrameProps {
  /** Absolute https URL of the published bundle. */
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
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(DEFAULT_HEIGHT_PX);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasErrored, setHasErrored] = useState(false);

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
    if (isLoaded) return;
    const timer = setTimeout(() => setHasErrored(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoaded]);

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
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-background">
      {!isLoaded ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background"
          data-testid="notebook-frame-loading"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading notebook…</p>
        </div>
      ) : null}
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
