"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useAgentChatStore } from "@/store/agentChat";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { useWhitelabel } from "@/utilities/whitelabel-context";
import { selectAskKarmaQuestions } from "../config";
import { useAskKarmaPersona } from "../hooks/use-ask-karma-persona";
import type { AskKarmaConfig } from "../types";
import { AskKarmaChat } from "./ask-karma-chat";
import { AskKarmaStart } from "./ask-karma-start";

type AskKarmaView = "start" | "leaving-start" | "chat" | "leaving-chat";

interface AskKarmaPageProps {
  config: AskKarmaConfig;
  communityId?: string;
}

// Keep this in sync with the exit animation durations on each view's
// `animate-out duration-*` class. We mount the leaving view for this long
// so its fade-out completes before we swap subtrees.
const FADE_OUT_MS = 220;

export function AskKarmaPage({ config, communityId }: AskKarmaPageProps) {
  const messages = useAgentChatStore((s) => s.messages);
  const isStreaming = useAgentChatStore((s) => s.isStreaming);
  const error = useAgentChatStore((s) => s.error);
  const clearMessages = useAgentChatStore((s) => s.clearMessages);
  const setAgentContext = useAgentChatStore((s) => s.setAgentContext);

  const { sendMessage, abort } = useAgentStream();
  const [view, setView] = useState<AskKarmaView>("start");

  // Tailor the start-screen prompts to the visitor (signed out vs. reviewer
  // vs. grantee) on top of the tenant config resolved on the server. Only the
  // example questions change, so the rest of the config flows through.
  const persona = useAskKarmaPersona(communityId);
  const startConfig = useMemo<AskKarmaConfig>(
    () => ({ ...config, exampleQuestions: selectAskKarmaQuestions(config, persona) }),
    [config, persona]
  );
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    clearMessages();
    setAgentContext(communityId ? { communityId } : null);
    return () => {
      abort();
      clearMessages();
      setAgentContext(null);
      if (transitionTimeout.current) {
        clearTimeout(transitionTimeout.current);
        transitionTimeout.current = null;
      }
    };
  }, [communityId, clearMessages, setAgentContext, abort]);

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text || isStreaming) return;
      if (view === "start") {
        setView("leaving-start");
        if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
        transitionTimeout.current = setTimeout(() => setView("chat"), FADE_OUT_MS);
      }
      sendMessage(text);
    },
    [isStreaming, sendMessage, view]
  );

  const handleBack = useCallback(() => {
    abort();
    setView("leaving-chat");
    if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
    transitionTimeout.current = setTimeout(() => {
      clearMessages();
      setView("start");
    }, FADE_OUT_MS);
  }, [abort, clearMessages]);

  const showStart = view === "start" || view === "leaving-start";
  const showChat = view === "chat" || view === "leaving-chat";
  const isLeaving = view === "leaving-start" || view === "leaving-chat";

  // Page-level exit CTA. Lives on the page wrapper (not inside either view)
  // so it stays put across the start↔chat crossfade and is reachable from
  // either surface. Whitelabel: community IS the root → "/"; main domain:
  // explicit community root via the PAGES helper (CLAUDE.md rule: never
  // hardcode route strings); root /ask-karma fallback: "/".
  const { isWhitelabel } = useWhitelabel();
  const communityExitHref =
    isWhitelabel || !communityId ? "/" : PAGES.COMMUNITY.ALL_GRANTS(communityId);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-start pt-6">
        <Link
          href={communityExitHref}
          data-testid="ask-karma-go-to-community"
          className={cn(
            "group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-[rgb(var(--color-primary-dark))]",
            "transition-all duration-200 ease-out",
            "hover:bg-[rgb(var(--color-primary))]/5 hover:text-zinc-900 hover:gap-2",
            "active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]/50",
            "dark:text-[rgb(var(--color-primary-light))] dark:hover:bg-[rgb(var(--color-primary-dark))]/30 dark:hover:text-[rgb(var(--color-primary-light))]"
          )}
        >
          <ArrowLeftIcon
            className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
          Go to community view
        </Link>
      </div>
      {showStart && (
        <div
          key="start"
          data-testid="ask-karma-start-view"
          data-view-state={view}
          // While the start view is fading out (`leaving-start`), keep it
          // visible for the exit animation but block any new clicks/edits
          // — any input during that 220ms window would be discarded when
          // the chat view mounts. aria-hidden so assistive tech also skips
          // the disappearing subtree.
          aria-hidden={view === "leaving-start"}
          className={cn(
            "py-8",
            view === "leaving-start"
              ? "pointer-events-none animate-out fade-out slide-out-to-top-2 duration-200"
              : "animate-in fade-in slide-in-from-bottom-1 duration-300"
          )}
          style={isLeaving ? { animationFillMode: "forwards" } : undefined}
        >
          <AskKarmaStart config={startConfig} onSubmit={handleSubmit} />
        </div>
      )}
      {showChat && (
        <div
          key="chat"
          data-testid="ask-karma-chat-view"
          data-view-state={view}
          // Symmetric to leaving-start: lock interaction during the chat
          // view's fade-out so a stray click on Back / Send during the
          // 220ms exit can't double-fire.
          aria-hidden={view === "leaving-chat"}
          className={cn(
            // 100dvh (dynamic viewport) avoids the iOS Safari quirk where
            // 100vh ignores the on-screen keyboard. Fallback min-h keeps
            // the layout sane on older browsers that don't support dvh.
            "h-[calc(100dvh-180px)] min-h-[520px] py-6",
            view === "leaving-chat"
              ? "pointer-events-none animate-out fade-out slide-out-to-bottom-2 duration-200"
              : "animate-in fade-in slide-in-from-bottom-3 duration-300"
          )}
          style={isLeaving ? { animationFillMode: "forwards" } : undefined}
        >
          <AskKarmaChat
            config={config}
            messages={messages}
            isStreaming={isStreaming}
            error={error}
            onSend={handleSubmit}
            onStop={abort}
            onBack={handleBack}
          />
        </div>
      )}
    </div>
  );
}
