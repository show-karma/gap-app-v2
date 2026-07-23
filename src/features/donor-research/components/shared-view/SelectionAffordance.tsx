"use client";

import { MessageSquarePlusIcon } from "lucide-react";

interface SelectionAffordanceProps {
  /** Document-coordinate position the button anchors to. */
  position: { top: number; left: number };
  /** Click handler — opens the root composer with the captured anchor. */
  onClick: () => void;
}

/**
 * Floating "Comment" button that appears next to a non-collapsed text
 * selection inside an anchorable region. Positioned in document
 * coordinates so it follows scroll and survives reflow until dismissed.
 */
export function SelectionAffordance({ position, onClick }: SelectionAffordanceProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Avoid clearing the active selection before the click fires.
        e.preventDefault();
      }}
      onClick={onClick}
      data-selection-affordance
      style={{
        position: "absolute",
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="z-30 inline-flex items-center gap-1.5 rounded-full border border-sf-line-strong bg-sf-card px-2.5 py-1.5 text-[12px] font-medium text-sf-heading shadow-md hover:bg-sf-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <MessageSquarePlusIcon className="h-3.5 w-3.5" aria-hidden />
      Comment
    </button>
  );
}
