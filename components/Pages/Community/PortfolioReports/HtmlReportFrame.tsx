"use client";

import DOMPurify from "dompurify";
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
 * textarea (see sanitizeReportDocument).
 */
export function HtmlReportFrame({ html, title }: Props) {
  const hostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });

    const doc = sanitizeReportDocument(html);

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

const FORBIDDEN_TAGS = [
  "meta",
  "base",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
];

const ALLOWED_STYLESHEET_PREFIX = "https://fonts.googleapis.com/";

/**
 * The shadow root is same-origin with the app, and report content can be
 * authored by a community admin, so it is allowlist-sanitized: anything
 * DOMPurify does not know to be inert is dropped. Forms are removed outright
 * and the only external stylesheet kept is the web-font host.
 */
function sanitizeReportDocument(html: string): Document {
  const root = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    RETURN_DOM: true,
    ADD_TAGS: ["style", "link"],
    FORBID_TAGS: FORBIDDEN_TAGS,
  }) as HTMLHtmlElement;
  const doc = root.ownerDocument;

  for (const link of doc.querySelectorAll("link")) {
    const isFontStylesheet =
      link.getAttribute("rel") === "stylesheet" &&
      (link.getAttribute("href") ?? "").startsWith(ALLOWED_STYLESHEET_PREFIX);
    if (!isFontStylesheet) {
      link.remove();
    }
  }

  return doc;
}
