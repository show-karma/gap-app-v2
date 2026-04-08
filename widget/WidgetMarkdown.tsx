import { cjk } from "@streamdown/cjk";
import { memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/utilities/tailwind";

// Intentionally exclude @streamdown/code — it bundles shiki (~8MB of syntax grammars).
// The widget uses plain <code> styling instead, which is sufficient for a chat assistant.
const streamdownPlugins = { cjk };

interface WidgetMarkdownProps {
  children: string;
  className?: string;
}

export const WidgetMarkdown = memo(
  ({ children, className }: WidgetMarkdownProps) => (
    <Streamdown
      className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
      plugins={streamdownPlugins}
    >
      {children}
    </Streamdown>
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

WidgetMarkdown.displayName = "WidgetMarkdown";
