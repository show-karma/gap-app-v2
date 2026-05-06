"use client";

import { useEffect, useRef } from "react";

interface Props {
  html: string;
  /** Accessible label, mirrors the prior iframe `title` prop. */
  title: string;
}

/**
 * Renders a self-contained HTML report (full `<!DOCTYPE html>` document
 * produced by the agentic generator's HTML pipeline) inside a Shadow
 * DOM. Shadow DOM gives us the same style isolation an iframe did,
 * without the iframe drawbacks: no ResizeObserver / scrollHeight
 * measurement (the host `<div>` flows to its natural content height),
 * no inner scrollbar, no sandboxed-modal weirdness around print.
 *
 * The BE-produced HTML is a complete document. Shadow roots only
 * accept fragment content, so we parse the doc with DOMParser, inject
 * its `<style>` tags + body innerHTML into the shadow root, and drop
 * the on-screen Export button (its old iframe-print path is being
 * replaced; tracked separately).
 */
export function HtmlReportFrame({ html, title }: Props) {
  const hostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });

    const doc = new DOMParser().parseFromString(html, "text/html");

    // Drop the on-screen Export PDF button — its old click handler
    // (iframe.contentWindow.print()) was unreliable across browsers,
    // and the new export path will live outside the rendered HTML.
    for (const node of doc.querySelectorAll(".btn-export")) {
      node.remove();
    }

    const styles = Array.from(doc.head.querySelectorAll("style, link[rel='stylesheet']"))
      .map((node) => node.outerHTML)
      .join("");

    root.innerHTML = styles + doc.body.innerHTML;
  }, [html]);

  return <section ref={hostRef} aria-label={title} />;
}
