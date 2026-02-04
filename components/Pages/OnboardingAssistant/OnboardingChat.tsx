"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import React, { useCallback, useEffect, useRef } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { cn } from "@/utilities/tailwind";
import type { ChatMessage } from "./types";

function MessageSkeleton() {
  return (
    <div className="flex flex-col justify-start">
      <div className="w-44 justify-center items-center rounded-lg p-3 py-5 bg-[#EEF4FF] dark:bg-zinc-800">
        <div className="flex justify-center items-center space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
        </div>
      </div>
      <div className="flex flex-row items-center gap-2 mt-2">
        <Image src="/logo/logo-dark.png" width={16} height={16} alt="Karma AI" quality={50} />
        <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Karma AI Assistant</p>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble = React.memo(({ message }: MessageBubbleProps) => {
  const isAssistant = message.role === "assistant";

  // Filter out json code blocks from display
  const displayContent = message.content.replace(/```json\s*[\s\S]*?```/g, "").trim();

  if (!displayContent && isAssistant) {
    return null;
  }

  return (
    <div className={cn("flex flex-col w-full", isAssistant ? "items-start" : "items-end")}>
      <div
        className={cn(
          "max-w-[85%] p-3 rounded-xl text-sm",
          isAssistant
            ? "bg-[#EEF4FF] dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-bl-none"
            : "bg-indigo-500 text-white rounded-br-none"
        )}
      >
        {isAssistant ? (
          <MarkdownPreview
            source={displayContent}
            style={{
              color: "inherit",
              fontWeight: 400,
              fontSize: "14px",
            }}
          />
        ) : (
          <p className="whitespace-pre-wrap">{displayContent}</p>
        )}
      </div>
      {isAssistant && (
        <div className="flex items-center gap-2 mt-1">
          <Image src="/logo/logo-dark.png" width={14} height={14} alt="Karma AI" quality={50} />
          <p className="text-zinc-500 dark:text-zinc-400 text-[11px] font-medium">
            Karma AI Assistant
          </p>
        </div>
      )}
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

interface OnboardingChatProps {
  messages: ChatMessage[];
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
}

export function OnboardingChat({
  messages,
  input,
  onInputChange,
  onSubmit,
  isLoading,
  isStreaming,
  error,
}: OnboardingChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && !isStreaming && <MessageSkeleton />}
        {isLoading && isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <MessageSkeleton />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 pb-2">
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-zinc-700 p-4">
        <form onSubmit={onSubmit} className="relative w-full" aria-label="Chat with Karma AI">
          <input
            type="text"
            className="w-full p-3 pr-12 text-sm text-black dark:text-zinc-200 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-600 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            value={input}
            placeholder="Type your message..."
            onChange={onInputChange}
            disabled={isLoading}
            aria-label="Chat input"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-brand-blue disabled:text-gray-400 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
