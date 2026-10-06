"use client";

import DOMPurify from "dompurify";
import { useEffect, useState } from "react";

// This policy is placed before any customer markup. No network resources,
// scripts, forms, plugins, or nested frames are permitted in the document.
const REPORT_CSP =
  "default-src 'none'; script-src 'none'; connect-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

interface Props {
  html: string;
  title: string;
}

export function SandboxedReportFrame({ html, title }: Props) {
  const [srcDoc, setSrcDoc] = useState("");

  useEffect(() => {
    const clean = DOMPurify.sanitize(html, {
      WHOLE_DOCUMENT: true,
      RETURN_DOM: true,
      ADD_TAGS: ["style"],
      FORBID_TAGS: [
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
      ],
    }) as HTMLHtmlElement; // WHOLE_DOCUMENT + RETURN_DOM returns the HTML root.
    const doc = clean.ownerDocument;
    const styles = Array.from(doc.querySelectorAll("style"), (style) => style.outerHTML).join("");
    for (const style of doc.body.querySelectorAll("style")) style.remove();
    doc.head.innerHTML = `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${REPORT_CSP}"><meta name="viewport" content="width=device-width, initial-scale=1">${styles}`;
    setSrcDoc(`<!doctype html>${clean.outerHTML}`);
  }, [html]);

  // Mount only after sanitization, and replace the browsing context on edits.
  // This avoids racing an initial empty srcdoc navigation with the report.
  if (!srcDoc) return <p className="p-4 text-muted-foreground">Loading report…</p>;

  return (
    <iframe
      key={srcDoc}
      title={title}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      className="h-[85vh] min-h-[600px] w-full rounded-lg border-0 bg-background"
    />
  );
}
