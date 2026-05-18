"use client";

import { useTheme } from "next-themes";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Components } from "streamdown";
import styles from "@/styles/markdown.module.css";
import { cn } from "@/utilities/tailwind";

// Inline props type — avoids pulling @uiw/react-markdown-preview into the bundle
// while keeping call-site compatibility for the props we actually use.
interface MarkdownPreviewProps {
  source?: string;
  className?: string;
  /** "inline" strips Streamdown's table chrome (toolbar + card) for help text + submitted answers. */
  variant?: "default" | "inline";
  // biome-ignore lint/suspicious/noExplicitAny: matches @uiw allowElement call-site signatures
  allowElement?: (element: any, index: number, parent: any) => boolean;
  // biome-ignore lint/suspicious/noExplicitAny: ComponentType<any> makes destructured params explicit-any, avoiding noImplicitAny errors at call sites
  components?: Record<string, ComponentType<any>>;
  // biome-ignore lint/suspicious/noExplicitAny: no-op kept for call-site compatibility; explicit any avoids noImplicitAny on node param
  rehypeRewrite?: (node: any, index?: number, parent?: any) => void;
  [key: string]: unknown; // absorb remaining unused @uiw props without breaking call sites
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

  const preparedSource = useMemo(
    () => (source ? completeMissingTableSeparators(source) : ""),
    [source]
  );

  const mergedComponents = useMemo<Components>(
    () => ({
      p: ({ children }) => (
        <p className="mb-2" style={{ backgroundColor: "transparent", color: "currentColor" }}>
          {children}
        </p>
      ),
      ...(variant === "inline" ? inlineTableComponents : {}),
      ...(components as Partial<Components>),
    }),
    [components, variant]
  );

  if (!source) return null;

  // Plain-text fallback while Streamdown's dynamic import resolves. Most
  // descriptions are plain prose — the fallback avoids a full-width skeleton
  // pulse on every field during cold loads, and the cached second render
  // upgrades to rich markdown instantly.
  if (!StreamdownComponent || !codePlugin || !remarkBreaksPlugin || !remarkGfmPlugin) {
    return <span className={cn("whitespace-pre-wrap", className)}>{source}</span>;
  }

  return (
    <div
      className="preview w-full max-w-full text-foreground"
      data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
    >
      <StreamdownComponent
        mode="static"
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
