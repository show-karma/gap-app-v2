"use client";

import { useTheme } from "next-themes";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import type { Components } from "streamdown";
import styles from "@/styles/markdown.module.css";
import { cn } from "@/utilities/tailwind";

// Inline props type — avoids pulling @uiw/react-markdown-preview into the bundle
// while keeping call-site compatibility for the props we actually use.
interface MarkdownPreviewProps {
  source?: string;
  className?: string;
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

// GFM requires a `|---|---|` separator row directly under the header. Many
// form authors write only the header row and expect it to render as a table.
// Detect those cases and inject a separator so remark-gfm picks it up.
function countCells(pipeRow: string): number {
  return pipeRow.split("|").filter((c, idx, arr) => {
    if (idx === 0 && c.trim() === "") return false;
    if (idx === arr.length - 1 && c.trim() === "") return false;
    return true;
  }).length;
}

// Bypass Streamdown's default table chrome (copy/download toolbar + card
// wrapper) for inline help text. Renders compact, plain HTML tables that
// inherit the surrounding text color and pick up `markdown.module.css` styles.
export const inlineDescriptionMarkdownComponents = {
  table: ({ children, ...props }: { children?: React.ReactNode }) => (
    <table
      className="w-full border-collapse text-[0.8em] my-2 border border-zinc-200 dark:border-zinc-700 rounded"
      {...props}
    >
      {children}
    </table>
  ),
  th: ({ children, ...props }: { children?: React.ReactNode }) => (
    <th
      className="text-left font-semibold px-2 py-1 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: { children?: React.ReactNode }) => (
    <td className="px-2 py-1 border-b border-zinc-200/60 dark:border-zinc-700/60" {...props}>
      {children}
    </td>
  ),
};

function completeMissingTableSeparators(source: string): string {
  if (!source.includes("|")) return source;

  const lines = source.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);

    if (!TABLE_ROW_RE.test(line)) continue;

    const prev = lines[i - 1];
    const isFirstPipeRow =
      prev === undefined || (!TABLE_ROW_RE.test(prev) && !TABLE_SEPARATOR_RE.test(prev));
    if (!isFirstPipeRow) continue;

    const next = lines[i + 1];
    if (next !== undefined && TABLE_SEPARATOR_RE.test(next)) continue;

    const cellCount = countCells(line);
    if (cellCount < 2) continue;

    out.push(`| ${Array(cellCount).fill("---").join(" | ")} |`);
  }

  return out.join("\n");
}

export const MarkdownPreview = ({
  source,
  className,
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

  if (!source) return null;

  if (!StreamdownComponent || !codePlugin || !remarkBreaksPlugin || !remarkGfmPlugin) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-full" />;
  }

  const mergedComponents: Components = {
    p: ({ children }) => (
      <p className="mb-2" style={{ backgroundColor: "transparent", color: "currentColor" }}>
        {children}
      </p>
    ),
    ...(components as Partial<Components>),
  };

  const preparedSource = completeMissingTableSeparators(source);

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
