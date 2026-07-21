"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { KARMA_ASSISTANT_PANEL_ID } from "@/components/AgentChat/panel-dom";
// Deliberately NOT SparklesIcon: sparkles is the app-wide marker for
// AI-*generated content* (AI evaluation, analysis tabs, inbox scores), so it
// reads as "AI touched this" rather than "talk to me".
import { KarmaLogo } from "@/components/Icons/Karma";
import { useAgentChatStore } from "@/store/agentChat";
import { isAskKarmaPathname } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

interface NavbarAssistantButtonProps {
  /**
   * Icon-only rendering for the mobile bar, where the label does not fit
   * alongside the avatar and hamburger.
   */
  compact?: boolean;
  className?: string;
}

/**
 * Top-level navbar trigger for the Karma Assistant.
 *
 * Replaces the floating bottom-right bubble as the primary entry point. It
 * only toggles the shared Zustand flag — the panel itself is still rendered by
 * `AgentChatBubble` in `DeferredLayoutComponents`, which keeps the other
 * entry points (community header ⌘K, milestone `@mention` buttons) working
 * unchanged since they all drive the same `setOpen`.
 */
export function NavbarAssistantButton({ compact = false, className }: NavbarAssistantButtonProps) {
  const isOpen = useAgentChatStore((state) => state.isOpen);
  const toggleOpen = useAgentChatStore((state) => state.toggleOpen);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(isOpen);
  const focusWasInsidePanel = useRef(false);

  // Track where focus lives *while the panel is open*, rather than reading it
  // back after the close. By then the panel is already `inert`, the browser has
  // moved focus off it, and `document.activeElement` is whatever the blur
  // landed on — so the check would depend on whether this effect happens to run
  // before that blur is processed. It does in Chrome today; that is timing, not
  // a guarantee.
  useEffect(() => {
    if (!isOpen) return;
    const panel = document.getElementById(KARMA_ASSISTANT_PANEL_ID);
    if (!panel) return;

    const sync = () => {
      focusWasInsidePanel.current = panel.contains(document.activeElement);
    };
    sync();
    document.addEventListener("focusin", sync);
    return () => document.removeEventListener("focusin", sync);
  }, [isOpen]);

  // The panel becomes `inert` when it closes, which would orphan the focus
  // ring. Pull focus back to the trigger, but only when it was still inside the
  // panel — never steal it from wherever the user has already moved on to.
  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      // The desktop and mobile navbars are both always mounted and merely
      // hidden from each other with `lg:` classes, so two triggers exist at
      // once. Without this check the hidden one also tries to take focus, and
      // which instance wins comes down to effect ordering.
      const isVisible = (buttonRef.current?.getClientRects().length ?? 0) > 0;
      if (isVisible && focusWasInsidePanel.current) {
        buttonRef.current?.focus();
      }
      focusWasInsidePanel.current = false;
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  // `/ask-karma` is itself a full-screen assistant surface and unmounts the
  // panel, so a trigger there would be a dead control pointing at nothing.
  if (isAskKarmaPathname(pathname ?? "")) return null;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggleOpen}
      aria-expanded={isOpen}
      aria-controls={KARMA_ASSISTANT_PANEL_ID}
      aria-label="Ask Karma"
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-full border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // Icon-only until there is room for the label. At the `lg` breakpoint
        // the desktop navbar is already at its natural minimum width, so a
        // labelled button here overflows the row and pushes the whole
        // right-hand cluster — theme toggle and account menu included — off
        // screen, where it cannot be clicked at all.
        compact ? "w-9" : "w-9 xl:w-auto xl:gap-1.5 xl:px-3 xl:text-sm",
        isOpen
          ? "border-brand-blue bg-brand-blue text-white hover:bg-brand-blue/90"
          : "border-brand-blue/30 bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/10",
        className
      )}
    >
      {/* KarmaLogo is the `currentColor` build of the mark, so it follows the
          button from brand-blue at rest to white when open. The SVGs under
          `public/logo/` cannot: they bake in #1de9b6 and white. */}
      <span aria-hidden="true" className="flex items-center justify-center">
        <KarmaLogo className={compact ? "h-4 w-4" : "h-4 w-4 xl:h-3.5 xl:w-3.5"} />
      </span>
      {/* The button keeps its `aria-label` at every width, so hiding the text
          below `xl` costs nothing for assistive tech. */}
      {!compact && <span className="hidden xl:inline">Ask Karma</span>}
    </button>
  );
}
