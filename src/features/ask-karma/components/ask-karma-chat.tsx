"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckIcon,
  Loader2Icon,
  SparklesIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { memo, useEffect, useRef } from "react";
import { MessageResponse } from "@/src/components/ai-elements/message-response";
import type { ChatMessage, ToolHistoryEvent } from "@/store/agentChat";
import { cn } from "@/utilities/tailwind";
import type { AskKarmaConfig } from "../types";
import { AskKarmaInput } from "./ask-karma-input";

/**
 * Turn an agent tool identifier (`aggregate_grants`, `searchGrants`) into a
 * human-readable label ("aggregate grants", "search grants"). Lower-cased
 * to match the karmagrants visual reference; if the model emits a name we
 * don't recognise we still render it so the list stays informative.
 */
function humanizeToolName(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(timestamp);
}

interface MessageBubbleProps {
  message: ChatMessage;
  /**
   * Whether this assistant message is still streaming. Completed messages render
   * with `mode="static"` so Streamdown's streaming/animation wrappers can't
   * suppress finished content from the accessibility tree (WCAG 4.1.2 / #1462).
   */
  isStreaming?: boolean;
}

const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming = false,
}: MessageBubbleProps) {
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
            : "bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary-dark))] dark:bg-[rgb(var(--color-primary-dark))]/30 dark:text-[rgb(var(--color-primary-light))]"
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
            <MessageResponse mode={isStreaming ? "streaming" : "static"}>
              {message.content}
            </MessageResponse>
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

/**
 * Single row of the tool activity list. Three states map 1:1 to icons:
 *   running → ⟳ (spinning loader, zinc)
 *   success → ✓ (emerald check)
 *   error   → ✗ (red x)
 */
function ToolHistoryRow({ tool }: { tool: ToolHistoryEvent }) {
  return (
    <li
      data-testid="ask-karma-tool-row"
      data-tool-status={tool.status}
      className="flex items-center gap-2 text-xs"
    >
      <span aria-hidden="true" className="inline-flex h-3.5 w-3.5 items-center justify-center">
        {/* Status icons keep their universal semantic colours — emerald for
            success, red for failure — even on tenants whose brand colour
            differs. Reading "✓" as success is a stronger UX cue than
            matching the tenant palette. Do NOT swap these for
            --color-primary in a tenant-theming pass. */}
        {tool.status === "success" && (
          <CheckIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        )}
        {tool.status === "error" && (
          <XIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
        )}
        {tool.status === "running" && (
          <Loader2Icon className="h-3.5 w-3.5 animate-spin text-zinc-500 dark:text-zinc-400" />
        )}
      </span>
      <span
        className={cn(
          "font-mono text-zinc-700 dark:text-zinc-300",
          tool.status === "error" && "text-red-700 dark:text-red-300"
        )}
      >
        {humanizeToolName(tool.name)}
      </span>
      {/* a11y status sentence — visually hidden but read out per row */}
      <span className="sr-only">{tool.status}</span>
    </li>
  );
}

interface ThinkingPanelProps {
  title: string;
  toolHistory?: ToolHistoryEvent[];
}

/**
 * Streaming placeholder shown while the assistant has been added to the
 * store but no tokens have arrived yet. Replaces the prior bare-dot
 * indicator with a real attribution surface (avatar, agent name, current
 * activity, and the running tool list) so users know who is responding
 * and what is happening.
 *
 * <output> gives us implicit role="status" + aria-live="polite" so
 * assistive tech announces the waiting state without interrupting focus.
 */
function ThinkingPanel({ title, toolHistory }: ThinkingPanelProps) {
  // The current "activity" — the most recent running tool, falling back to
  // the most recent tool of any status, falling back to the generic
  // "thinking…" copy. Mirrors karmagrants' "searching 140,221 filings…"
  // status line at the top of their thinking box.
  const runningTool = toolHistory?.findLast((t) => t.status === "running");
  const latestTool = toolHistory?.[toolHistory.length - 1];
  const activityLabel = runningTool
    ? `running ${humanizeToolName(runningTool.name)}…`
    : latestTool
      ? `${humanizeToolName(latestTool.name)}…`
      : "thinking…";

  return (
    // <output> has implicit role="status" + aria-live="polite" — a native
    // a11y signal that assistive tech announces the waiting state without
    // interrupting focus. Cleaner than div + ARIA attributes.
    <output
      data-testid="ask-karma-thinking"
      aria-label={`${title} is ${activityLabel.replace(/…$/, "")}`}
      className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300"
    >
      <div
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary-dark))] dark:bg-[rgb(var(--color-primary-dark))]/30 dark:text-[rgb(var(--color-primary-light))]"
        aria-hidden="true"
      >
        <SparklesIcon className="h-4 w-4 animate-pulse" />
        {/* Subtle outer-ring breathing pulse — communicates "working" without
            shouting like a spinner would. */}
        <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-[rgb(var(--color-primary))]/40 animate-ping" />
      </div>
      <div className="flex flex-col gap-2 rounded-2xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{title}</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[rgb(var(--color-primary))]/50 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[rgb(var(--color-primary))]/50 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[rgb(var(--color-primary))]/50 [animation-delay:300ms]" />
          </span>
        </div>
        <span className="text-xs italic text-zinc-500 dark:text-zinc-400">{activityLabel}</span>
        {toolHistory && toolHistory.length > 0 && (
          <ul
            data-testid="ask-karma-tool-list"
            className="mt-1 flex flex-col gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-800"
          >
            {toolHistory.map((tool) => (
              <ToolHistoryRow key={tool.id} tool={tool} />
            ))}
          </ul>
        )}
      </div>
    </output>
  );
}

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
  // Keep the thinking panel + tool list visible for the entire duration
  // of the stream, not just the pre-first-token window. Multi-turn agents
  // emit one assistant event per turn; between turns (while a tool is
  // running) content is present but the agent is still working. Hiding
  // the indicator there falsely signals "done".
  const showThinking = isStreaming && lastMessage?.role === "assistant";

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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary-dark))] transition-transform duration-300 hover:scale-105 dark:bg-[rgb(var(--color-primary-dark))]/30 dark:text-[rgb(var(--color-primary-light))]"
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
        {/* The community-exit CTA lives at the page level (AskKarmaPage)
            so it stays put across the start↔chat crossfade. The chat
            header only needs its own internal-nav button. */}
        <button
          type="button"
          onClick={onBack}
          data-testid="ask-karma-back-to-topics"
          className={cn(
            "group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-zinc-500",
            "transition-all duration-200 ease-out",
            "hover:bg-zinc-100 hover:text-zinc-900 hover:gap-2",
            "active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
            "dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          )}
        >
          <ArrowLeftIcon
            className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
          Back to topics
        </button>
      </header>

      <div
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        className="flex flex-1 flex-col gap-6 overflow-y-auto py-6"
      >
        {messages.length === 0 && !isStreaming && (
          <div
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-2 text-center",
              "animate-in fade-in duration-500"
            )}
          >
            <SparklesIcon className="h-8 w-8 text-[rgb(var(--color-primary))]" aria-hidden="true" />
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Ask a question to get started.
            </p>
          </div>
        )}

        {messages.map((message, index) => {
          // While the agent stream is warming up the assistant message
          // exists with `content: ""` — rendering MessageBubble at that
          // point produces a hollow rounded box stacked on top of the
          // thinking panel. Skip the empty placeholder; the thinking
          // panel below carries the visual.
          if (message.role === "assistant" && !message.content) return null;
          // Only the last assistant message is actively streaming; every
          // earlier message is complete and must render statically so its
          // content is queryable in the accessibility tree.
          const messageStreaming =
            isStreaming && message.role === "assistant" && index === messages.length - 1;
          return (
            <MessageBubble key={message.id} message={message} isStreaming={messageStreaming} />
          );
        })}

        {showThinking && (
          <ThinkingPanel title={config.assistantTitle} toolHistory={lastMessage?.toolHistory} />
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
