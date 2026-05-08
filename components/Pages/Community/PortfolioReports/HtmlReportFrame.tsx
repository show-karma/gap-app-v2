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
 * measurement (the host `<section>` flows to its natural content
 * height), no inner scrollbar, no sandboxed-modal weirdness around
 * print.
 *
 * The BE-produced HTML is a complete document. Shadow roots only
 * accept fragment content, so we parse the doc with DOMParser, inject
 * its `<style>` tags + body content into the shadow root, drop the
 * legacy in-content Export PDF button, and harden against unsafe
 * markup that could land in `report.content` via the admin Edit
 * textarea (see sanitizeFragment).
 */
export function HtmlReportFrame({ html, title }: Props) {
  const hostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });

    const doc = new DOMParser().parseFromString(html, "text/html");

    sanitizeFragment(doc);

    // Drop the legacy on-screen Export PDF button. New reports don't
    // emit it; reports already in storage from before that BE change
    // still do.
    for (const node of doc.querySelectorAll(".btn-export")) {
      node.remove();
    }

    // The renderer's stylesheet targets `body { ... }` for page-level
    // styles (margin, background, default text color, font). Inside a
    // shadow root there is no <body> element, so those rules would
    // silently miss. Rewriting `body` → `:host` makes them apply to
    // the shadow host (our <section>), which is the visual equivalent.
    // The negative-lookbehind avoids matching things like `nobody` or
    // class fragments containing "body".
    const styles = Array.from(doc.head.querySelectorAll("style, link[rel='stylesheet']"))
      .map((node) => node.outerHTML)
      .join("")
      .replace(/(?<![\w-])body(?=[\s,{])/g, ":host");

    root.innerHTML = styles + doc.body.innerHTML;
  }, [html]);

  return <section ref={hostRef} aria-label={title} />;
}

/**
 * Strip XSS surface from the parsed HTML before it's injected into the
 * shadow root. Shadow DOM `innerHTML` does not auto-execute `<script>`
 * tags, but it DOES fire `onerror` / `onload` / other inline event
 * handlers — and a same-origin shadow root can read the host page's
 * cookies. The Edit textarea on the editor page lets a community
 * admin paste arbitrary HTML; if their account is ever compromised,
 * stored content shouldn't become an XSS sink.
 *
 * - Removes `<script>` and `<iframe>` and similar active elements.
 * - Drops `on*` event-handler attributes from every remaining node.
 * - Rewrites `javascript:` / `data:` / `vbscript:` URLs in href/src.
 */
function sanitizeFragment(doc: Document): void {
  const ACTIVE_TAGS = new Set([
    "script",
    "iframe",
    "object",
    "embed",
    "frame",
    "frameset",
    "applet",
    "meta",
    "base",
  ]);
  const UNSAFE_URL = /^\s*(javascript|vbscript|data):/i;

  for (const node of Array.from(doc.querySelectorAll("*"))) {
    if (ACTIVE_TAGS.has(node.tagName.toLowerCase())) {
      node.remove();
      continue;
    }
    for (const attr of Array.from(node.attributes)) {
      if (attr.name.toLowerCase().startsWith("on")) {
        node.removeAttribute(attr.name);
        continue;
      }
      if (
        (attr.name === "href" || attr.name === "src" || attr.name === "xlink:href") &&
        UNSAFE_URL.test(attr.value)
      ) {
        node.removeAttribute(attr.name);
      }
    }
  }
}
