"use client";

import { memo, useMemo } from "react";
import { MessageResponse } from "@/src/components/ai-elements/message-response";
import { linkifyNarrative } from "../lib/linkify-narrative";
import { remarkAutolinkUrls } from "../lib/remark-autolink-urls";
import type { RankedEntity } from "../types/philanthropy";

interface NarrativeBlockProps {
  narrative: string;
  entities: RankedEntity[];
}

const REMARK_PLUGINS = [remarkAutolinkUrls];

// Render every link the same way, regardless of how the agent formatted it.
// External links open in a new tab so the user never loses their conversation;
// internal links (entity detail pages) navigate in place.
//
// The `!` (important) modifier on color + underline is deliberate: the
// ai-elements message container styles descendant anchors (`text-foreground`,
// no underline) at a higher specificity than single-class utilities, which
// would otherwise render these as near-black, non-underlined body text — i.e.
// not looking like links at all. `!important` lets the link styling win.
const MARKDOWN_COMPONENTS = {
  // `node` is the mdast node react-markdown injects — strip it so it never
  // reaches the DOM. `target`/`rel` are also stripped from the incoming props
  // (the renderer defaults external links to `_blank`): we decide them solely
  // from the href, so INTERNAL entity links navigate in place instead of
  // wrongly opening a new tab.
  a: ({
    href,
    children,
    node: _node,
    target: _target,
    rel: _rel,
    ...props
  }: React.ComponentProps<"a"> & { node?: unknown }) => {
    const isExternal = typeof href === "string" && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        className="font-medium !text-brand !underline !decoration-brand/40 underline-offset-2 transition-colors hover:!text-brand-emphasis hover:!decoration-brand"
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...props}
      >
        {children}
      </a>
    );
  },
};

export const NarrativeBlock = memo(function NarrativeBlock({
  narrative,
  entities,
}: NarrativeBlockProps) {
  const linked = useMemo(
    () => (entities.length > 0 ? linkifyNarrative(narrative, entities) : narrative),
    [narrative, entities]
  );

  return (
    <MessageResponse remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
      {linked}
    </MessageResponse>
  );
});
