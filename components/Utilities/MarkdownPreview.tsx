"use client";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSanitize from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import styles from "@/styles/markdown.module.css";
import { cn } from "@/utilities/tailwind";

// Lazy load the heavy markdown preview library with a loading state
const Preview = dynamic(() => import("@uiw/react-markdown-preview"), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-full" />,
});

export const MarkdownPreview: typeof Preview = (props) => {
  const { theme: currentTheme } = useTheme();
  return (
    <div className="preview w-full max-w-full" data-color-mode={currentTheme}>
      <Preview
        className={cn("wmdeMarkdown", styles.wmdeMarkdown, props.className)}
        rehypePlugins={[
          rehypeSanitize,
          [rehypeExternalLinks, { target: "_blank", rel: ["nofollow", "noopener", "noreferrer"] }],
        ]}
        remarkPlugins={[remarkGfm, remarkBreaks]}
        style={{
          backgroundColor: "transparent",
          color: currentTheme === "dark" ? "white" : "rgb(36, 41, 47)",
          width: "100%",
          maxWidth: "100%",
        }}
        components={{
          p: ({ children }) => <span className={props.className}>{children}</span>,
          code: ({ children }) => (
            <code
              className={cn("bg-zinc-600 dark:bg-gray-800 p-2 rounded-md", props.className)}
              style={{
                display: "block",
                overflow: "auto",
                maxWidth: "100%",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                // backgroundColor: "black",
              }}
            >
              {children}
            </code>
          ),
        }}
        {...props}
      />
    </div>
  );
};
