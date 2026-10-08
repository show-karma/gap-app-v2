"use client";

import DOMPurify from "dompurify";
import { memo, useEffect, useState } from "react";

// Placed before any customer markup: no scripts, network, forms, plugins or
// nested frames; inline CSS and embedded data images only.
const REPORT_CSP =
  "default-src 'none'; script-src 'none'; connect-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

const FORBIDDEN_TAGS = [
  "meta",
  "base",
  "link",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "foreignObject",
];

interface Props {
  /** Full HTML document as the external agent produced it. */
  html: string;
  /** Accessible name for the frame. */
  title: string;
}

function buildSrcDoc(html: string): string {
  const root = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    RETURN_DOM: true,
    ADD_TAGS: ["style"],
    FORBID_TAGS: FORBIDDEN_TAGS,
  }) as HTMLHtmlElement;
  const doc = root.ownerDocument;
  const styles = Array.from(doc.querySelectorAll("style"), (style) => style.outerHTML).join("");
  for (const style of doc.body.querySelectorAll("style")) style.remove();
  doc.head.innerHTML = `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${REPORT_CSP}"><meta name="viewport" content="width=device-width, initial-scale=1">${styles}`;
  return `<!doctype html>${root.outerHTML}`;
}

/**
 * Renders a report saved from an external agent (via MCP) inside an isolated
 * iframe. The server already allowlist-sanitizes the stored HTML; this is the
 * second layer: DOMPurify on the client, a CSP ahead of the customer's styles,
 * an empty `sandbox=""` (opaque origin, no scripts/forms/popups/parent access)
 * and `no-referrer`.
 *
 * Height: the sandbox blocks reading the document's scrollHeight, so the frame
 * takes the viewport height with a tall floor and the document scrolls inside.
 */
function ExternalReportFrameComponent({ html, title }: Props) {
  const [srcDoc, setSrcDoc] = useState("");

  useEffect(() => {
    setSrcDoc(html.trim() ? buildSrcDoc(html) : "");
  }, [html]);

  if (!html.trim()) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
        This report has no content yet.
      </div>
    );
  }

  if (!srcDoc) {
    return <p className="p-4 text-sm text-zinc-500 dark:text-zinc-400">Loading report…</p>;
  }

  return (
    <iframe
      key={srcDoc}
      srcDoc={srcDoc}
      sandbox=""
      referrerPolicy="no-referrer"
      title={title}
      className="block h-screen min-h-[48rem] w-full border-0 bg-white"
      data-testid="external-report-frame"
    />
  );
}

export const ExternalReportFrame = memo(ExternalReportFrameComponent);
