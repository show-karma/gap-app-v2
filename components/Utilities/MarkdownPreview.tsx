"use client";

import { useTheme } from "next-themes";
import type { ComponentType, CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Components } from "streamdown";
import styles from "@/styles/markdown.module.css";
import { cn } from "@/utilities/tailwind";

// Inline props type — avoids pulling @uiw/react-markdown-preview into the bundle
// while keeping call-site compatibility for the props we actually use. The
// interface is closed (no `[key: string]: unknown` index signature): every prop
// a call site passes must be declared and consumed below, so a prop the
// component does not read is a compile error instead of a silent no-op (#1278).
interface MarkdownPreviewProps {
  source?: string;
  className?: string;
  /** Inline style forwarded to the preview's outer wrapper. */
  style?: CSSProperties;
  /**
   * "inline" strips Streamdown's table chrome (toolbar + card) for help text + submitted answers.
   * "excerpt" renders a static, non-interactive prose preview for clamped cards/links:
   *   disables Streamdown's copy/download/fullscreen chrome (`controls={false}`), demotes
   *   links/images/code blocks/checkboxes/headings to inert elements, and truncates the
   *   source to a word boundary before parsing so 50 cards don't each mount kilobytes of
   *   hidden markdown DOM. Makes it structurally impossible for user-authored markdown to
   *   inject interactive elements (buttons, anchors) into a card.
   */
  variant?: "default" | "inline" | "excerpt";
  // biome-ignore lint/suspicious/noExplicitAny: matches @uiw allowElement call-site signatures
  allowElement?: (element: any, index: number, parent: any) => boolean;
  // biome-ignore lint/suspicious/noExplicitAny: ComponentType<any> makes destructured params explicit-any, avoiding noImplicitAny errors at call sites
  components?: Record<string, ComponentType<any>>;
}

type StreamdownType = typeof import("streamdown").Streamdown;
type CodePluginType = typeof import("@streamdown/code").code;
type RemarkBreaksType = typeof import("remark-breaks").default;
type RemarkGfmType = typeof import("remark-gfm").default;

const TABLE_ROW_RE = /^\s*\|.+\|\s*$/;
const TABLE_SEPARATOR_RE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const FENCE_RE = /^\s*(```|~~~)/;

function countCells(pipeRow: string): number {
  return pipeRow.split("|").filter((c, idx, arr) => {
    if (idx === 0 && c.trim() === "") return false;
    if (idx === arr.length - 1 && c.trim() === "") return false;
    return true;
  }).length;
}

// Compact table/th/td overrides applied when `variant="inline"`. Skips
// Streamdown's default table card wrapper and copy/download toolbar — those
// are designed for AI-streamed data tables, not inline help text or
// submitted-answer rendering.
const inlineTableComponents = {
  table: ({ children, ...props }: React.ComponentProps<"table">) => (
    <table
      className="w-full border-collapse text-[0.8em] my-2 border border-zinc-200 dark:border-zinc-700 rounded"
      {...props}
    >
      {children}
    </table>
  ),
  th: ({ children, ...props }: React.ComponentProps<"th">) => (
    <th
      className="text-left font-semibold px-2 py-1 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.ComponentProps<"td">) => (
    <td className="px-2 py-1 border-b border-zinc-200/60 dark:border-zinc-700/60" {...props}>
      {children}
    </td>
  ),
};

// Maximum characters of source that the excerpt variant parses. Cards visually
// clamp to ~3 lines; parsing far past that only inflates hidden DOM. We truncate
// before parsing so 50 markdown-rich cards/page stop rendering kilobytes each.
const EXCERPT_MAX_CHARS = 500;

// Truncate at a word boundary at or before maxChars, then strip a dangling
// markdown token that the cut may have orphaned (an unbalanced fence, an
// unterminated `[label`/`![alt` open-bracket, or a trailing backslash) so the
// excerpt parser never sees a half-open construct.
function truncateAtWordBoundary(source: string, maxChars: number): string {
  if (source.length <= maxChars) return source;

  const slice = source.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  let truncated = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;

  // Balance code fences: an odd count means we cut inside a fenced block.
  const fenceCount = (truncated.match(/```|~~~/g) || []).length;
  if (fenceCount % 2 !== 0) {
    truncated = truncated.replace(/(```|~~~)[^`~]*$/, "");
  }

  // Drop a dangling unterminated link/image opener (`[label`, `![alt`, `[`).
  truncated = truncated.replace(/!?\[[^\]]*$/, "");

  // Drop a trailing escape backslash left without its escaped char.
  truncated = truncated.replace(/\\+$/, "");

  return `${truncated.trimEnd()}…`;
}

// Inert component overrides for `variant="excerpt"`. Centralizes hacks that used
// to live at every clamped-card call site (ProjectCard's `a → span` override and
// `rewriteHeadingsToLevel(6)`, GrantCard's `allowElement` link filter):
//   - `a → span`        no nested <a> inside the card's own <Link> (WCAG 4.1.2)
//   - `img → alt span`  kills Streamdown's "Download image" button wrapper
//   - `pre → inline code` keeps a code snippet's text without the copy/download toolbar
//   - `input → null`     drops task-list checkboxes (interactive controls)
//   - `h1-h6 → p`        a card owns its own heading; markdown headings must not
//                        pollute the page heading outline from inside a link
const excerptComponents = {
  a: ({ children }: React.ComponentProps<"a">) => <span>{children}</span>,
  img: ({ alt }: React.ComponentProps<"img">) =>
    alt ? <span className="italic opacity-70">{alt}</span> : null,
  pre: ({ children }: React.ComponentProps<"pre">) => (
    <code className="font-mono text-[0.85em]">{children}</code>
  ),
  input: () => null,
  h1: ({ children }: React.ComponentProps<"h1">) => (
    <p className="mb-2 font-semibold">{children}</p>
  ),
  h2: ({ children }: React.ComponentProps<"h2">) => (
    <p className="mb-2 font-semibold">{children}</p>
  ),
  h3: ({ children }: React.ComponentProps<"h3">) => (
    <p className="mb-2 font-semibold">{children}</p>
  ),
  h4: ({ children }: React.ComponentProps<"h4">) => (
    <p className="mb-2 font-semibold">{children}</p>
  ),
  h5: ({ children }: React.ComponentProps<"h5">) => (
    <p className="mb-2 font-semibold">{children}</p>
  ),
  h6: ({ children }: React.ComponentProps<"h6">) => (
    <p className="mb-2 font-semibold">{children}</p>
  ),
};

// GFM requires a `|---|---|` separator row directly under the header. Form
// authors often write only the header row and expect it to render as a table;
// inject the separator so remark-gfm picks it up. Skips fenced code blocks so
// we don't mangle code samples containing pipes.
function completeMissingTableSeparators(source: string): string {
  if (!source.includes("|")) return source;

  const lines = source.split("\n");
  const out: string[] = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);

    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (!TABLE_ROW_RE.test(line)) continue;

    const prev = lines[i - 1];
    const isFirstPipeRow =
      prev === undefined || (!TABLE_ROW_RE.test(prev) && !TABLE_SEPARATOR_RE.test(prev));
    if (!isFirstPipeRow) continue;

    const next = lines[i + 1];
    if (next !== undefined && TABLE_SEPARATOR_RE.test(next)) continue;

    // Single-column tables (`| x |`) are ambiguous with prose containing a
    // pipe, so we leave them as text.
    const cellCount = countCells(line);
    if (cellCount < 2) continue;

    out.push(`| ${Array(cellCount).fill("---").join(" | ")} |`);
  }

  return out.join("\n");
}

export const MarkdownPreview = ({
  source,
  className,
  style,
  variant,
  allowElement,
  components,
}: MarkdownPreviewProps) => {
  const { resolvedTheme } = useTheme();
  const [StreamdownComponent, setStreamdownComponent] = useState<StreamdownType | null>(null);
  const [codePlugin, setCodePlugin] = useState<CodePluginType | null>(null);
  const [remarkBreaksPlugin, setRemarkBreaksPlugin] = useState<RemarkBreaksType | null>(null);
  const [remarkGfmPlugin, setRemarkGfmPlugin] = useState<RemarkGfmType | null>(null);
  useEffect(() => {
    Promise.all([
      import("streamdown").then((m) => m.Streamdown),
      import("@streamdown/code").then((m) => m.code),
      import("remark-breaks").then((m) => m.default),
      import("remark-gfm").then((m) => m.default),
      import("streamdown/styles.css" as string),
    ])
      .then(([Streamdown, code, remarkBreaks, remarkGfm]) => {
        setStreamdownComponent(() => Streamdown);
        setCodePlugin(() => code);
        setRemarkBreaksPlugin(() => remarkBreaks);
        setRemarkGfmPlugin(() => remarkGfm);
      })
      .catch((err) => {
        console.error("Failed to load markdown preview dependencies:", err);
      });
  }, []);

  const preparedSource = useMemo(() => {
    if (!source) return "";
    const truncated =
      variant === "excerpt" ? truncateAtWordBoundary(source, EXCERPT_MAX_CHARS) : source;
    return completeMissingTableSeparators(truncated);
  }, [source, variant]);

  const mergedComponents = useMemo<Components>(
    () => ({
      p: ({ children }) => (
        <p className="mb-2" style={{ backgroundColor: "transparent", color: "currentColor" }}>
          {children}
        </p>
      ),
      // User-authored markdown must never mint page-level headings: every
      // surface embedding this preview (cards, descriptions, comments) sits on
      // a page that already owns its single h1. Demote markdown h1 -> h2 so
      // the document outline stays intact; excerpt goes further (h1-h6 -> p)
      // via excerptComponents below.
      h1: ({ children }: React.ComponentProps<"h1">) => <h2>{children}</h2>,
      ...(variant === "inline" ? inlineTableComponents : {}),
      ...(variant === "excerpt" ? (excerptComponents as Partial<Components>) : {}),
      ...(components as Partial<Components>),
    }),
    [components, variant]
  );

  if (!source) return null;

  // Plain-text fallback while Streamdown's dynamic import resolves. Block-level
  // wrapper matches the final render's outer `<div>` so the swap doesn't reflow
  // surrounding layout on cold load. The excerpt variant shows the already
  // word-boundary-truncated source so the fallback never paints a full
  // multi-kilobyte description.
  if (!StreamdownComponent || !codePlugin || !remarkBreaksPlugin || !remarkGfmPlugin) {
    const fallbackText =
      variant === "excerpt" ? truncateAtWordBoundary(source, EXCERPT_MAX_CHARS) : source;
    return (
      <div className={cn("preview w-full max-w-full whitespace-pre-wrap", className)} style={style}>
        {fallbackText}
      </div>
    );
  }

  return (
    <div
      className="preview w-full max-w-full text-foreground"
      style={style}
      data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
    >
      <StreamdownComponent
        mode="static"
        // Excerpt previews must never render Streamdown's copy/download/fullscreen
        // chrome — those inject icon-only, unlabeled <button>s into card links.
        controls={variant === "excerpt" ? false : undefined}
        plugins={{ code: codePlugin }}
        remarkPlugins={[remarkGfmPlugin, remarkBreaksPlugin]}
        className={cn("wmdeMarkdown", styles.wmdeMarkdown, className)}
        allowElement={allowElement ?? undefined}
        components={mergedComponents}
      >
        {preparedSource}
      </StreamdownComponent>
    </div>
  );
};
