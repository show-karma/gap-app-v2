"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useAgentChatStore } from "@/store/agentChat";
import { cn } from "@/utilities/tailwind";
import type { AskKarmaConfig } from "../types";
import { AskKarmaChat } from "./ask-karma-chat";
import { AskKarmaStart } from "./ask-karma-start";

export type AskKarmaView = "start" | "leaving-start" | "chat" | "leaving-chat";

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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      {showStart && (
        <div
          key="start"
          data-testid="ask-karma-start-view"
          data-view-state={view}
          className={cn(
            "py-8",
            view === "leaving-start"
              ? "animate-out fade-out slide-out-to-top-2 duration-200"
              : "animate-in fade-in slide-in-from-bottom-1 duration-300"
          )}
          style={isLeaving ? { animationFillMode: "forwards" } : undefined}
        >
          <AskKarmaStart config={config} onSubmit={handleSubmit} />
        </div>
      )}
      {showChat && (
        <div
          key="chat"
          data-testid="ask-karma-chat-view"
          data-view-state={view}
          className={cn(
            "h-[calc(100vh-180px)] min-h-[520px] py-6",
            view === "leaving-chat"
              ? "animate-out fade-out slide-out-to-bottom-2 duration-200"
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
