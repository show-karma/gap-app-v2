"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/16/solid";
import React, { type FC, useMemo } from "react";
import { requestOpenNote } from "@/components/Inbox/noteNavigation";
import { Button } from "@/components/ui/button";
import { splitNoteMentions } from "@/utilities/noteMentions";
import { cn } from "@/utilities/tailwind";

interface NoteContentProps {
  content: string;
  className?: string;
}

/** Note text with each mention rendered as a link to the note it points at. */
const NoteContentComponent: FC<NoteContentProps> = ({ content, className }) => {
  const segments = useMemo(() => splitNoteMentions(content), [content]);
  return (
    <p className={cn("whitespace-pre-wrap break-words text-sm", className)}>
      {segments.map((segment, index) =>
        segment.type === "text" ? (
          <React.Fragment key={`t-${index.toString()}`}>{segment.text}</React.Fragment>
        ) : (
          <Button
            key={`m-${segment.mention.noteId}-${index.toString()}`}
            type="button"
            variant="link"
            size="sm"
            title="Open this note"
            onClick={() =>
              requestOpenNote({ itemId: segment.mention.itemId, noteId: segment.mention.noteId })
            }
            className="inline h-auto whitespace-normal p-0 align-baseline text-sm font-medium text-primary-700 dark:text-primary-300"
          >
            @{segment.mention.label}
            <ArrowTopRightOnSquareIcon className="ml-0.5 inline h-3 w-3" aria-hidden="true" />
          </Button>
        )
      )}
    </p>
  );
};

export const NoteContent = React.memo(NoteContentComponent);
NoteContent.displayName = "NoteContent";
