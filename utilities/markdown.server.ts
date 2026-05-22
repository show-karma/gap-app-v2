import MarkdownIt from "markdown-it";

// Server-only markdown renderer. The shared `markdown.ts` helpers rely on
// DOMPurify, which needs a browser `window` and therefore cannot run inside a
// React Server Component. markdown-it is pure JS: with `html: false` it escapes
// any embedded raw HTML, and its built-in link validation rejects dangerous
// protocols (javascript:, vbscript:, data: except images) — safe for SSR.
const md = new MarkdownIt({
  linkify: true,
  html: false,
  breaks: true,
});

const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

// Match the client renderer: open links in a new tab, don't pass link equity.
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrPush(["target", "_blank"]);
  tokens[idx].attrPush(["rel", "nofollow noopener noreferrer"]);
  return defaultLinkOpen(tokens, idx, options, env, self);
};

/**
 * Renders a markdown string to sanitized HTML on the server. Returns an empty
 * string for empty input so callers can skip rendering empty sections.
 */
export function renderMarkdownToHtml(source: string | undefined | null): string {
  if (!source) return "";
  return md.render(source);
}
