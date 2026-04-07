"use client";

import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import type { ComponentProps } from "react";
import { memo, useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/utilities/tailwind";

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

const lazyMath = () => import("@streamdown/math").then((m) => m.math);
const lazyMermaid = () => import("@streamdown/mermaid").then((m) => m.mermaid);

function useStreamdownPlugins() {
  const [plugins, setPlugins] = useState<Record<string, unknown>>({ cjk, code });

  useEffect(() => {
    let cancelled = false;
    Promise.all([lazyMath(), lazyMermaid()]).then(([mathPlugin, mermaidPlugin]) => {
      if (!cancelled) {
        setPlugins({ cjk, code, math: mathPlugin, mermaid: mermaidPlugin });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return plugins;
}

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => {
    const plugins = useStreamdownPlugins();
    return (
      <Streamdown
        className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
        plugins={plugins}
        {...props}
      />
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

MessageResponse.displayName = "MessageResponse";
