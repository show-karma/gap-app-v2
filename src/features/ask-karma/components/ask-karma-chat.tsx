"use client";

import { AlertCircleIcon, ArrowLeftIcon, SparklesIcon, UserIcon } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import { MessageResponse } from "@/src/components/ai-elements/message-response";
import type { ChatMessage } from "@/store/agentChat";
import { cn } from "@/utilities/tailwind";
import type { AskKarmaConfig } from "../types";
import { AskKarmaInput } from "./ask-karma-input";

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(timestamp);
}

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      data-testid={`ask-karma-message-${message.role}`}
      className={cn(
        "flex w-full items-start gap-3",
        "animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200",
          "animate-in zoom-in-90 duration-200",
          isUser
            ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        )}
        aria-hidden="true"
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : <SparklesIcon className="h-4 w-4" />}
      </div>

      <div className={cn("flex max-w-[80%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed transition-shadow duration-200",
            "shadow-sm hover:shadow-md",
            isUser
              ? "rounded-tr-sm bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
              : "rounded-tl-sm border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MessageResponse>{message.content}</MessageResponse>
          )}
        </div>
        <time
          className={cn(
            "text-xs text-zinc-500 dark:text-zinc-400",
            "animate-in fade-in duration-500",
            isUser ? "pr-1 text-right" : "pl-1"
          )}
          style={{ animationDelay: "120ms", animationFillMode: "both" }}
        >
          {formatTime(message.timestamp)}
        </time>
      </div>
    </div>
  );
});

interface AskKarmaChatProps {
  config: AskKarmaConfig;
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onStop: () => void;
  onBack: () => void;
}

export function AskKarmaChat({
  config,
  messages,
  isStreaming,
  error,
  onSend,
  onStop,
  onBack,
}: AskKarmaChatProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastContent = messages[messages.length - 1]?.content;

  // During streaming, `lastContent` ticks on every token — smooth scrolling
  // on each tick produces visible jank. Use instant (`"auto"`) scroll while
  // streaming so the viewport keeps up with the stream, and smooth scroll
  // when idle for normal message turnover.
  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: isStreaming ? "auto" : "smooth",
      block: "end",
    });
  }, [isStreaming, lastContent, messages.length]);

  const lastMessage = messages[messages.length - 1];
  const showThinking = isStreaming && lastMessage?.role === "assistant" && !lastMessage.content;

  return (
    <div className="flex h-full flex-col">
      <header
        className={cn(
          "flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800",
          "animate-in fade-in slide-in-from-top-2 duration-300 ease-out"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition-transform duration-300 hover:scale-105 dark:bg-emerald-900/40 dark:text-emerald-300"
            aria-hidden="true"
          >
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {config.assistantTitle}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{config.assistantSubtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-emerald-700",
            "transition-all duration-200 ease-out",
            "hover:bg-emerald-50 hover:text-emerald-900 hover:gap-2",
            "active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
            "dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200"
          )}
        >
          <ArrowLeftIcon
            className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
          Back to topics
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto py-6">
        {messages.length === 0 && !isStreaming && (
          <div
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-2 text-center",
              "animate-in fade-in duration-500"
            )}
          >
            <SparklesIcon className="h-8 w-8 text-emerald-500" aria-hidden="true" />
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Ask a question to get started.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {showThinking && (
          <div
            className="flex items-start gap-3 animate-in fade-in duration-200"
            data-testid="thinking-dots"
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              aria-hidden="true"
            >
              <SparklesIcon className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className={cn(
              "flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700",
              "animate-in fade-in slide-in-from-bottom-1 duration-300",
              "dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
            )}
          >
            <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div
        className={cn(
          "border-t border-zinc-200 pt-4 dark:border-zinc-800",
          "animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
        )}
        style={{ animationDelay: "80ms", animationFillMode: "both" }}
      >
        <AskKarmaInput onSubmit={onSend} onStop={onStop} isStreaming={isStreaming} />
      </div>
    </div>
  );
}
