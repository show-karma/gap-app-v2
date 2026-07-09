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

// Optional heading demotion. When a caller renders user markdown *underneath* a
// page/section heading (e.g. the project About sections, which sit below the
// page <h1> and an <h2> section title), a leading `# ` in the content would emit
// a rogue <h1> and break the single-<h1> page outline. Passing `headingOffset`
// shifts every heading down by N levels (clamped to h6) so authored content can
// never introduce a heading above the level the caller reserves for it.
md.core.ruler.push("heading_offset", (state) => {
  const offset = (state.env as { headingOffset?: number })?.headingOffset ?? 0;
  if (!offset) return;
  for (const token of state.tokens) {
    if (token.type === "heading_open" || token.type === "heading_close") {
      const level = Number.parseInt(token.tag.slice(1), 10);
      token.tag = `h${Math.min(6, Math.max(1, level + offset))}`;
    }
  }
});

/**
 * Renders a markdown string to sanitized HTML on the server. Returns an empty
 * string for empty input so callers can skip rendering empty sections.
 *
 * @param options.headingOffset shift every heading down N levels (clamped to h6)
 *   so content rendered under a section heading cannot emit an <h1>/outrank it.
 */
export function renderMarkdownToHtml(
  source: string | undefined | null,
  options?: { headingOffset?: number }
): string {
  if (!source) return "";
  return md.render(source, { headingOffset: options?.headingOffset ?? 0 });
}
