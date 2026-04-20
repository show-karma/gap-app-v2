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
  useEffect(() => {
    Promise.all([
      import("streamdown").then((m) => m.Streamdown),
      import("@streamdown/code").then((m) => m.code),
      import("remark-breaks").then((m) => m.default),
      import("streamdown/styles.css" as string),
    ])
      .then(([Streamdown, code, remarkBreaks]) => {
        setStreamdownComponent(() => Streamdown);
        setCodePlugin(() => code);
        setRemarkBreaksPlugin(() => remarkBreaks);
      })
      .catch((err) => {
        console.error("Failed to load markdown preview dependencies:", err);
      });
  }, []);

  if (!source) return null;

  if (!StreamdownComponent || !codePlugin || !remarkBreaksPlugin) {
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

  return (
    <div
      className="preview w-full max-w-full text-foreground"
      data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
    >
      <StreamdownComponent
        mode="static"
        plugins={{ code: codePlugin }}
        remarkPlugins={[remarkBreaksPlugin]}
        className={cn("wmdeMarkdown", styles.wmdeMarkdown, className)}
        allowElement={allowElement ?? undefined}
        components={mergedComponents}
      >
        {source}
      </StreamdownComponent>
    </div>
  );
};
