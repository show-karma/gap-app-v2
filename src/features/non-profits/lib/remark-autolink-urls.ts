/**
 * remark plugin: make every URL in the agent narrative a real, consistent link.
 *
 * The agent's markdown is inconsistent about links — it emits some as proper
 * `[text](https://…)` links, some as bare `https://…` URLs (GFM autolinks
 * those), and some as scheme-less domains like `fordfoundation.org`. GFM does
 * NOT autolink scheme-less domains, and react-markdown treats a scheme-less
 * link href as a *relative* path — so `[Ford](fordfoundation.org)` renders as
 * an underlined link that navigates nowhere. That is the "some URLs were
 * underlined but weren't links" report from users.
 *
 * This plugin normalizes both cases on the mdast tree (so it never touches code
 * spans/blocks or existing absolute/internal links):
 *  - bare URLs and scheme-less domains in text become proper link nodes;
 *  - existing link nodes with a scheme-less external href get `https://`
 *    prepended.
 *
 * Internal app links (href starting with `/`, `#`, `mailto:`, `tel:`) — e.g.
 * the entity links injected by `linkifyNarrative` — are left untouched.
 */

// Minimal mdast shapes — @types/mdast isn't a top-level dependency under pnpm.
interface MdastText {
  type: "text";
  value: string;
}
interface MdastLink {
  type: "link";
  url: string;
  title?: string | null;
  children: MdastNode[];
}
interface MdastParent {
  type: string;
  children: MdastNode[];
}
type MdastNode = (MdastText | MdastLink | MdastParent) & {
  type: string;
  children?: MdastNode[];
  url?: string;
  value?: string;
};

// Node types whose subtree must never be autolinked or rewritten.
const SKIP_TYPES = new Set([
  "link",
  "linkReference",
  "code",
  "inlineCode",
  "image",
  "imageReference",
  "definition",
  "html",
]);

// Conservative TLD allowlist for scheme-less domains, so prose like
// "e.g." or "vs." is never mistaken for a domain.
const TLD = "com|org|net|edu|gov|io|co|us|uk|ca|foundation|fund|charity|ngo";

// Order matters: full URLs first, then www., then scheme-less domains.
// Trailing sentence punctuation is intentionally excluded from the match.
const URL_PATTERN = new RegExp(
  [
    "(https?:\\/\\/[^\\s<>()\\[\\]]+[^\\s<>()\\[\\].,;:!?'\"])",
    "(www\\.[^\\s<>()\\[\\]]+[^\\s<>()\\[\\].,;:!?'\"])",
    `((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${TLD})(?:\\/[^\\s<>()\\[\\]]*[^\\s<>()\\[\\].,;:!?'"])?)`,
  ].join("|"),
  "gi"
);

/**
 * Returns an absolute `https://` URL for an external reference, or `null` when
 * the href is internal/relative and should be left as-is.
 */
export function normalizeUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (/^(mailto:|tel:|\/|#|\.)/i.test(url)) return null;
  if (/^www\./i.test(url)) return `https://${url}`;
  // Scheme-less domain with an allowlisted TLD (optionally a path).
  const domain = new RegExp(`^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:${TLD})(?:[/?#].*)?$`, "i");
  if (domain.test(url)) return `https://${url}`;
  return null;
}

/**
 * Splits a plain-text string into a sequence of text + link nodes, autolinking
 * any bare URL or scheme-less domain. Returns `null` when there is nothing to
 * link (so callers can leave the original node untouched).
 */
export function autolinkText(value: string): MdastNode[] | null {
  URL_PATTERN.lastIndex = 0;
  const nodes: MdastNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = URL_PATTERN.exec(value);
  let linked = false;

  while (match !== null) {
    const raw = match[0];
    const href = normalizeUrl(raw);
    if (href) {
      if (match.index > lastIndex) {
        nodes.push({ type: "text", value: value.slice(lastIndex, match.index) });
      }
      nodes.push({ type: "link", url: href, children: [{ type: "text", value: raw }] });
      lastIndex = match.index + raw.length;
      linked = true;
    }
    match = URL_PATTERN.exec(value);
  }

  if (!linked) return null;
  if (lastIndex < value.length) {
    nodes.push({ type: "text", value: value.slice(lastIndex) });
  }
  return nodes;
}

function walk(parent: MdastNode): void {
  const children = parent.children;
  if (!children) return;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (child.type === "link") {
      // Repair scheme-less external hrefs; leave internal links alone.
      const fixed = normalizeUrl(child.url ?? "");
      if (fixed) child.url = fixed;
      continue;
    }
    if (SKIP_TYPES.has(child.type)) continue;

    if (child.type === "text" && typeof child.value === "string") {
      const replacement = autolinkText(child.value);
      if (replacement) {
        children.splice(i, 1, ...replacement);
        i += replacement.length - 1;
      }
      continue;
    }

    if (child.children) walk(child);
  }
}

/** remark plugin entry point. */
export function remarkAutolinkUrls() {
  return (tree: MdastNode): void => {
    walk(tree);
  };
}
