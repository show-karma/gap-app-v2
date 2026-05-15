"use client";

import { CornerDownLeftIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { type ChatMessage, useChat } from "@/hooks/useChat";
import { TEAM_ROLE_LABELS, type TeamRole } from "@/lib/hermes-client";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/src/components/ai-elements/conversation";
import { Message, MessageContent } from "@/src/components/ai-elements/message";
import { MessageResponse } from "@/src/components/ai-elements/message-response";

interface Props {
  slug: string;
  role: TeamRole;
}

export function TeamChat({ slug, role }: Props) {
  const { messages, sending, send, stop } = useChat(slug, role);

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text || sending) return;
      send(text);
    },
    [sending, send]
  );

  return (
    <div className="flex h-[72vh] flex-col rounded-lg border bg-white">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title={`Chat with ${TEAM_ROLE_LABELS[role]}`}
              description={`Say hi. ${TEAM_ROLE_LABELS[role]} can read your Org Brain and use their own tools as part of the conversation.`}
            />
          ) : (
            messages.map((m) => <ChatTurn key={m.id} message={m} role={role} />)
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-gray-50/60 p-3">
        <ChatComposer
          placeholder={`Message ${TEAM_ROLE_LABELS[role]}`}
          isStreaming={sending}
          onSubmit={handleSubmit}
          onStop={stop}
        />
      </div>
    </div>
  );
}

function ChatTurn({ message, role }: { message: ChatMessage; role: TeamRole }) {
  const from: "user" | "assistant" = message.role;
  return (
    <Message from={from}>
      <MessageContent>
        {from === "user" ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            {(message.tools ?? []).length > 0 ? (
              <ToolActivity
                tools={message.tools ?? []}
                isStreaming={message.state === "streaming"}
              />
            ) : null}
            {message.content ? <MessageResponse>{message.content}</MessageResponse> : null}
            {message.state === "streaming" && !message.content ? <StreamingPulse /> : null}
            {message.state === "error" && message.errorMessage ? (
              <div className="mt-2 text-xs text-red-600">{message.errorMessage}</div>
            ) : null}
            {message.state === "cancelled" ? (
              <div className="mt-2 text-xs text-gray-500">
                Stopped by you. {TEAM_ROLE_LABELS[role]} can pick up from here.
              </div>
            ) : null}
          </>
        )}
      </MessageContent>
    </Message>
  );
}

function StreamingPulse() {
  return (
    <output
      aria-label="thinking"
      className="ml-0.5 inline-block h-3 w-1.5 animate-pulse rounded bg-gray-400 align-middle"
    />
  );
}

function ToolActivity({
  tools,
  isStreaming,
}: {
  tools: NonNullable<ChatMessage["tools"]>;
  isStreaming: boolean;
}) {
  return (
    <div className="mb-3 rounded border border-gray-200 bg-gray-50/80 px-3 py-2 text-xs">
      <ul className="space-y-1 text-gray-700">
        {tools.map((t) => (
          <li key={t.id} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex-1 truncate">
              <span className="font-mono text-gray-800">{t.tool}</span>
              {t.preview ? <span className="ml-2 text-gray-500">{t.preview}</span> : null}
            </span>
            <ToolDuration tool={t} />
          </li>
        ))}
      </ul>
      {isStreaming ? (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
          <span className="h-1 w-1 animate-pulse rounded-full bg-gray-400 [animation-delay:0ms]" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-gray-400 [animation-delay:150ms]" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-gray-400 [animation-delay:300ms]" />
        </div>
      ) : null}
    </div>
  );
}

function ToolDuration({ tool }: { tool: NonNullable<ChatMessage["tools"]>[number] }) {
  if (tool.state === "running") {
    return <span className="shrink-0 text-gray-500">running…</span>;
  }
  if (tool.state === "error") {
    return <span className="shrink-0 text-red-600">failed</span>;
  }
  return (
    <span className="shrink-0 text-gray-400">
      {tool.durationMs ? `${tool.durationMs}ms` : "done"}
    </span>
  );
}

interface ComposerProps {
  placeholder: string;
  isStreaming: boolean;
  onSubmit: (text: string) => void;
  onStop: () => void;
}

function ChatComposer({ placeholder, isStreaming, onSubmit, onStop }: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [resize]);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || isStreaming) return;
    onSubmit(text);
    setValue("");
    requestAnimationFrame(resize);
  }, [value, isStreaming, onSubmit, resize]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      submit();
    }
  };

  const canSubmit = value.trim().length > 0 && !isStreaming;

  return (
    <div className="flex items-end gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 focus-within:border-gray-400">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        onKeyDown={handleKey}
        placeholder={placeholder}
        rows={1}
        maxLength={8000}
        className="min-h-[24px] flex-1 resize-none border-0 bg-transparent text-sm leading-6 outline-none placeholder:text-gray-400"
      />
      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop generating"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-900 text-white hover:bg-gray-700"
        >
          <SquareIcon className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Send message"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-blue text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <CornerDownLeftIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
