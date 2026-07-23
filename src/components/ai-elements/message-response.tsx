"use client";

import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import type { ComponentProps } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import remarkGfm from "remark-gfm";
import { Streamdown } from "streamdown";
import { cn } from "@/utilities/tailwind";

type MessageResponseProps = ComponentProps<typeof Streamdown>;

const lazyMath = () => import("@streamdown/math").then((m) => m.math);
const lazyMermaid = () => import("@streamdown/mermaid").then((m) => m.mermaid);

// `@streamdown/cjk` injects its own CJK-aware GFM strikethrough plugin
// (`remarkGfmStrikethroughCjkFriendly`) via `remarkPluginsAfter`, and it
// defaults to single-tilde strikethrough — independently of the remark-gfm
// config in MessageResponse below. AI narratives use a lone `~` to mean
// "approximately" (e.g. "~$182K ... ~$20K average"); single-tilde strikethrough
// pairs those tildes and strikes through the whole span between them. Rebuild
// the plugin entry to require `~~double~~` tildes so a single `~` renders
// literally. Matched by function name because the plugin isn't exported
// separately; if a future @streamdown/cjk renames it, we fall back to the
// default (no crash, just the old behavior).
// Defensive: this runs at module eval, so a throw here would break ALL markdown
// rendering. If a future @streamdown/cjk drops/renames the array, pass it
// through untouched (degrades to the default behavior) instead of crashing.
const cjkSingleTildeOff = {
  ...cjk,
  remarkPluginsAfter: Array.isArray(cjk.remarkPluginsAfter)
    ? cjk.remarkPluginsAfter.map((plugin) =>
        typeof plugin === "function" && plugin.name === "remarkGfmStrikethroughCjkFriendly"
          ? [plugin, { singleTilde: false }]
          : plugin
      )
    : cjk.remarkPluginsAfter,
};

function useStreamdownPlugins() {
  const [plugins, setPlugins] = useState<Record<string, unknown>>({
    cjk: cjkSingleTildeOff,
    code,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([lazyMath(), lazyMermaid()]).then(([mathPlugin, mermaidPlugin]) => {
      if (!cancelled) {
        setPlugins({ cjk: cjkSingleTildeOff, code, math: mathPlugin, mermaid: mermaidPlugin });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return plugins;
}

export const MessageResponse = memo(
  ({ className, remarkPlugins, ...props }: MessageResponseProps) => {
    const plugins = useStreamdownPlugins();
    // Streamdown enables remark-gfm (tables, strikethrough, task lists) via its
    // default `remarkPlugins`, but passing a custom array REPLACES that default
    // instead of extending it. Always include remark-gfm so consumers that add
    // their own remark plugins (e.g. URL autolinking) don't silently lose table
    // rendering. remark-gfm is already bundled by Streamdown, so this is free.
    //
    // `singleTilde: false` requires `~~double~~` tildes for strikethrough. AI
    // narratives routinely use a single `~` to mean "approximately" (e.g.
    // "~$182K ... ~$20K average"); with the default (singleTilde: true) GFM
    // pairs those two tildes and strikes through the whole span between them.
    const mergedRemarkPlugins = useMemo<MessageResponseProps["remarkPlugins"]>(
      () => [[remarkGfm, { singleTilde: false }], ...(remarkPlugins ?? [])],
      [remarkPlugins]
    );
    return (
      <Streamdown
        className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
        plugins={plugins}
        remarkPlugins={mergedRemarkPlugins}
        {...props}
      />
    );
  }
);

MessageResponse.displayName = "MessageResponse";
