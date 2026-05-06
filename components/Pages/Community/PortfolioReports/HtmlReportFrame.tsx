"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  html: string;
  /** Accessible title for the iframe. */
  title: string;
}

/**
 * Renders a self-contained HTML report (full `<!DOCTYPE html>` document
 * produced by the agentic generator's HTML pipeline) inside a sandboxed
 * iframe. The iframe isolates the report's embedded CSS from the host
 * app's styles and vice-versa.
 *
 * Height auto-grows to match the report's content using a
 * `ResizeObserver` on the iframe's body. We poll for content readiness
 * via the `onLoad` event and re-measure when the inner content reflows.
 */
export function HtmlReportFrame({ html, title }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState<number>(800);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;

    let observer: ResizeObserver | null = null;
    let detached = false;
    let printButton: Element | null = null;
    let printHandler: ((event: Event) => void) | null = null;

    function attach() {
      if (detached) return;
      const doc = iframe?.contentDocument;
      const body = doc?.body;
      if (!body) return;

      const measure = () => {
        const next = Math.max(body.scrollHeight, 400);
        setHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
      };
      measure();
      observer = new ResizeObserver(measure);
      observer.observe(body);

      // The renderer emits a visual `<button class="btn-export">` but
      // the iframe sandbox forbids scripts, so the button does nothing
      // on its own. Wire it from the host: clicking it opens the
      // browser's print dialog scoped to the iframe content, which the
      // user then "Save as PDF"s. Native, no extra deps.
      printButton = doc?.querySelector(".btn-export") ?? null;
      if (printButton) {
        printHandler = (event: Event) => {
          event.preventDefault();
          iframe?.contentWindow?.print();
        };
        printButton.addEventListener("click", printHandler);
      }
    }

    iframe.addEventListener("load", attach);
    // Re-attach on the first paint in case the load event already fired.
    attach();

    return () => {
      detached = true;
      iframe.removeEventListener("load", attach);
      observer?.disconnect();
      if (printButton && printHandler) {
        printButton.removeEventListener("click", printHandler);
      }
    };
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      title={title}
      // `allow-same-origin` is required for the resize observer to read
      // the iframe's body. We deliberately omit `allow-scripts` since
      // the renderer never emits any.
      sandbox="allow-same-origin"
      style={{
        width: "100%",
        border: "none",
        display: "block",
        height: `${height}px`,
        background: "#f5f6f8",
      }}
    />
  );
}
