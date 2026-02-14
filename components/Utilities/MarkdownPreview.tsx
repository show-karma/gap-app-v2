import Markdown from "react-markdown";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import styles from "@/styles/markdown.module.css";
import { cn } from "@/utilities/tailwind";

// Custom schema that extends the default to allow images
const baseSchema = defaultSchema || { tagNames: [], attributes: {} };
const customSchema = {
  ...baseSchema,
  tagNames: [...(baseSchema.tagNames || []), "img"],
  attributes: {
    ...baseSchema.attributes,
    img: ["src", "alt", "title", "width", "height", "loading"],
  },
};

export interface MarkdownPreviewProps {
  source?: string;
  className?: string;
  style?: React.CSSProperties;
  components?: Record<string, React.ComponentType<any>>;
  allowElement?: (element: any, index: number, parent: any) => boolean;
  rehypeRewrite?: (node: any, index?: number, parent?: any) => void;
}

/**
 * Converts an @uiw-style rehypeRewrite callback into a standard rehype plugin.
 * Uses unist-util-visit to traverse the tree and call the consumer's rewrite
 * callback on each node — matching the behavior of @uiw/react-markdown-preview.
 */
function createRehypeRewritePlugin(rewriteFn: NonNullable<MarkdownPreviewProps["rehypeRewrite"]>) {
  return () => (tree: any) => {
    visit(tree, (node: any, index, parent) => {
      rewriteFn(node, index ?? undefined, parent ?? undefined);
    });
  };
}

export function MarkdownPreview({
  source,
  className,
  style,
  components,
  allowElement,
  rehypeRewrite,
}: MarkdownPreviewProps) {
  const rehypePlugins: any[] = [
    [rehypeSanitize, customSchema],
    [rehypeExternalLinks, { target: "_blank", rel: ["nofollow", "noopener", "noreferrer"] }],
  ];
  if (rehypeRewrite) {
    rehypePlugins.push(createRehypeRewritePlugin(rehypeRewrite));
  }

  return (
    <div
      className={cn("prose prose-sm dark:prose-invert max-w-none", styles.wmdeMarkdown, className)}
      style={style}
    >
      <Markdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={rehypePlugins}
        allowElement={allowElement}
        components={{
          p: ({ children }) => <span className={className}>{children}</span>,
          code: ({ children }) => (
            <code className="bg-zinc-600 dark:bg-gray-800 p-2 rounded-md block overflow-auto max-w-full whitespace-pre-wrap break-words">
              {children}
            </code>
          ),
          ...components,
        }}
      >
        {source || ""}
      </Markdown>
    </div>
  );
}
