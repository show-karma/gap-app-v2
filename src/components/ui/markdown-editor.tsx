"use client";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

import dynamic from "next/dynamic";
import type { FC } from "react";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/utils/cn";

interface MarkdownEditorProps {
  value: string;
  onChange: any;
  className?: string;
  placeholderText?: string;
}
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

export const MarkdownEditor: FC<MarkdownEditorProps> = ({
  value,
  onChange,
  className = "",
  placeholderText,
}) => {
  return (
    <div
      data-color-mode="light"
      className="h-full w-full"
      style={{ minHeight: "100%" }}
    >
      <MDEditor
        className={cn(
          "flex-1 bg-white dark:bg-zinc-900 dark:text-white text-black dark:border-gray-600",
          className
        )}
        value={value}
        onChange={onChange}
        height={300}
        minHeight={270} // for some reason this is needed to prevent the editor from being too small
        preview="edit"
        previewOptions={{
          rehypePlugins: [[rehypeSanitize]],
        }}
        overflow={false}
        textareaProps={{
          placeholder: placeholderText,
          spellCheck: true,
          style: { height: "100%", minHeight: "100%" },
        }}
        highlightEnable={false}
      />
    </div>
  );
};
