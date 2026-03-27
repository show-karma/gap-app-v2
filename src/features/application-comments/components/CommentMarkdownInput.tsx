"use client";

import {
  defaultValueCtx,
  Editor,
  editorViewOptionsCtx,
  prosePluginsCtx,
  rootAttrsCtx,
  serializerCtx,
} from "@milkdown/core";
import { clipboard } from "@milkdown/plugin-clipboard";
import { history } from "@milkdown/plugin-history";
import { commonmark } from "@milkdown/preset-commonmark";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { nord } from "@milkdown/theme-nord";
import "@milkdown/theme-nord/lib/style.css";
import { Plugin, PluginKey } from "@milkdown/prose/state";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/utilities/tailwind";

const COMMENT_CHANGE_KEY = new PluginKey("COMMENT_CHANGE_TRACKER");

interface CommentMarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
  maxHeight?: number;
}

interface CommentEditorInnerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled: boolean;
  minHeight: number;
}

function CommentEditorInner({ value, onChange, disabled, minHeight }: CommentEditorInnerProps) {
  const onChangeRef = useRef(onChange);
  const ctxRef = useRef<{ get: <T>(slice: { readonly name: string }) => T } | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const { loading } = useEditor(() => {
    const changePlugin = new Plugin({
      key: COMMENT_CHANGE_KEY,
      view() {
        return {
          update(view, prevState) {
            if (view.state.doc.eq(prevState.doc)) return;
            try {
              const ctx = ctxRef.current;
              if (!ctx) return;
              const serializer = ctx.get(serializerCtx);
              const markdown = serializer(view.state.doc);
              onChangeRef.current(markdown);
            } catch {
              // Editor ctx not ready
            }
          },
          destroy() {},
        };
      },
    });

    return Editor.make()
      .config(nord)
      .config((ctx) => {
        ctxRef.current = ctx as unknown as { get: <T>(slice: { readonly name: string }) => T };
        ctx.set(defaultValueCtx, value);
        ctx.set(rootAttrsCtx, {
          "data-comment-editor": "true",
          ...(disabled ? { contenteditable: "false" } : {}),
        });
        ctx.set(editorViewOptionsCtx, {
          editable: () => !disabled,
        });
        const existingPlugins = ctx.get(prosePluginsCtx);
        ctx.set(prosePluginsCtx, [...existingPlugins, changePlugin]);
      })
      .use(commonmark)
      .use(history)
      .use(clipboard);
  });

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 dark:bg-zinc-800"
        style={{ height: minHeight }}
      >
        <div className="text-gray-400 dark:text-gray-500 text-sm">Loading editor...</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "comment-milkdown-editor",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
      style={{ minHeight }}
    >
      <Milkdown />
    </div>
  );
}

export function CommentMarkdownInput({
  value,
  onChange,
  onSubmit,
  placeholder: _placeholder = "Add a comment... (Markdown supported)",
  disabled = false,
  minHeight = 80,
  maxHeight: _maxHeight = 200,
}: CommentMarkdownInputProps) {
  const { theme: currentTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const colorMode = currentTheme === "dark" ? "dark" : "light";

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && onSubmit) {
        e.preventDefault();
        await onSubmit();
      }
    },
    [onSubmit]
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: MilkdownProvider wrapper needs keyDown for Cmd+Enter submit
    <div
      data-color-mode={mounted ? colorMode : "light"}
      className={cn(
        "rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700",
        currentTheme === "dark" ? "milkdown-dark" : "milkdown-light",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onKeyDown={handleKeyDown}
    >
      {mounted ? (
        <MilkdownProvider>
          <CommentEditorInner
            value={value}
            onChange={onChange}
            disabled={disabled}
            minHeight={minHeight}
          />
        </MilkdownProvider>
      ) : (
        <div
          className="flex items-center justify-center bg-gray-50 dark:bg-zinc-800"
          style={{ height: minHeight }}
        >
          <div className="text-gray-400 dark:text-gray-500 text-sm">Loading editor...</div>
        </div>
      )}
    </div>
  );
}
