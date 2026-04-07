import { memo, useMemo } from "react";

/**
 * Minimal markdown-to-HTML for the chat widget (~2KB vs ~400KB for Streamdown).
 * Supports: bold, italic, inline code, code blocks, links, lists, paragraphs, headers.
 *
 * Security: output is sanitized via DOM-based allowlist before rendering.
 */
function markdownToHtml(md: string): string {
  // Fenced code blocks: ```lang\n...\n```
  const html = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    return `<pre><code>${escapeHtml(code.trimEnd())}</code></pre>`;
  });

  // Process block-level elements line by line
  const lines = html.split("\n");
  const out: string[] = [];
  let inList: "ul" | "ol" | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip if inside a <pre> block (already handled)
    if (line.includes("<pre>")) {
      let block = line;
      while (!block.includes("</pre>") && i + 1 < lines.length) {
        i++;
        block += "\n" + lines[i];
      }
      closeList();
      out.push(block);
      continue;
    }

    // Headers: # to ####
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      out.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Unordered list: - or *
    const ulMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inList !== "ul") {
        closeList();
        out.push("<ul>");
        inList = "ul";
      }
      out.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list: 1.
    const olMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList !== "ol") {
        closeList();
        out.push("<ol>");
        inList = "ol";
      }
      out.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      closeList();
      out.push("");
      continue;
    }

    // Paragraph
    closeList();
    out.push(`<p>${inlineFormat(line)}</p>`);
  }

  closeList();
  return out.join("\n");

  function closeList() {
    if (inList) {
      out.push(inList === "ul" ? "</ul>" : "</ol>");
      inList = null;
    }
  }
}

/** Process inline markdown: bold, italic, code, links */
function inlineFormat(text: string): string {
  return (
    text
      // Inline code (must come before bold/italic to avoid conflicts)
      .replace(/`([^`]+)`/g, (_m, code) => `<code>${escapeHtml(code)}</code>`)
      // Bold+italic
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Links — only allow http/https URLs
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_m, label, url) => {
        const safeLabel = escapeHtml(label);
        const safeUrl = escapeHtml(url);
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
      })
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ALLOWED_TAGS = new Set([
  "p",
  "strong",
  "em",
  "code",
  "pre",
  "a",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
};

/** DOM-based sanitizer: strips any tags/attributes not in the allowlist */
function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

function sanitizeNode(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }
    const el = child as Element;
    if (!ALLOWED_TAGS.has(el.tagName.toLowerCase())) {
      // Replace disallowed tag with its text content
      el.replaceWith(document.createTextNode(el.textContent ?? ""));
      continue;
    }
    // Strip disallowed attributes
    const allowed = ALLOWED_ATTRS[el.tagName.toLowerCase()];
    for (const attr of Array.from(el.attributes)) {
      if (!allowed?.has(attr.name)) {
        el.removeAttribute(attr.name);
      }
    }
    sanitizeNode(el);
  }
}

interface LiteMarkdownProps {
  children: string;
}

export const LiteMarkdown = memo(function LiteMarkdown({ children }: LiteMarkdownProps) {
  const html = useMemo(() => sanitize(markdownToHtml(children)), [children]);
  // Safe: output is sanitized through DOM-based tag/attribute allowlist (sanitize())
  // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized above
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
});
