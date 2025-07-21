"use client";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import styles from "@/styles/markdown.module.css";
import { cn } from "@/lib/utils/cn";
import rehypeSanitize from "rehype-sanitize";
import rehypeExternalLinks from "rehype-external-links";

const Preview = dynamic(() => import("@uiw/react-markdown-preview"), {
  ssr: false,
});

export const MarkdownPreview: typeof Preview = (props) => {
  const { theme: currentTheme } = useTheme();
  return (
    <div className="preview w-full max-w-full" data-color-mode={currentTheme}>
      <Preview
        className={cn("wmdeMarkdown", styles.wmdeMarkdown, props.className)}
        rehypePlugins={[
          rehypeSanitize,
          [
            rehypeExternalLinks,
            { target: "_blank", rel: ["nofollow", "noopener", "noreferrer"] },
          ],
        ]}
        style={{
          backgroundColor: "transparent",
          color: currentTheme === "dark" ? "white" : "rgb(36, 41, 47)",
          width: "100%",
          maxWidth: "100%",
        }}
        components={{
          p: ({ children }) => <span>{children}</span>,
          code: ({ children }) => (
            <code
              style={{
                display: "block",
                overflow: "auto",
                maxWidth: "100%",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
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
