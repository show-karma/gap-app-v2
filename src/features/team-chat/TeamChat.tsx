"use client";

import { useState } from "react";
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
import {
  PromptInput,
  PromptInputBody,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/src/components/ai-elements/prompt-input";

interface Props {
  slug: string;
  role: TeamRole;
}

export function TeamChat({ slug, role }: Props) {
  const { messages, sending, send, stop } = useChat(slug, role);

  const handleSubmit = (message: { text?: string }) => {
    const text = (message.text ?? "").trim();
    if (!text || sending) return;
    send(text);
  };

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
        <PromptInput
          onSubmit={handleSubmit}
          // Per-prompt accept attachments are wired via the existing
          // component; we disable for v1 to keep the chat surface narrow.
          accept=""
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={`Message ${TEAM_ROLE_LABELS[role]}`}
              maxLength={8000}
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              {sending ? (
                <button
                  type="button"
                  onClick={stop}
                  className="rounded border bg-white px-3 py-1.5 text-sm"
                >
                  Stop
                </button>
              ) : null}
              <PromptInputSubmit status={sending ? "streaming" : undefined} disabled={sending} />
            </div>
          </PromptInputBody>
        </PromptInput>
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
            {message.content ? <MessageResponse>{message.content}</MessageResponse> : null}
            {message.state === "streaming" ? <StreamingPulse /> : null}
            {(message.tools ?? []).length > 0 ? <ToolActivity tools={message.tools ?? []} /> : null}
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

function ToolActivity({ tools }: { tools: NonNullable<ChatMessage["tools"]> }) {
  const [open, setOpen] = useState(false);
  const running = tools.filter((t) => t.state === "running").length;
  const completed = tools.filter((t) => t.state === "completed").length;
  return (
    <div className="mt-3 rounded border border-gray-200 bg-gray-50/80 px-3 py-2 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-gray-600"
        aria-expanded={open}
      >
        <span>
          {running > 0
            ? `Using tools — ${completed} done, ${running} running`
            : `Used ${completed} tool${completed === 1 ? "" : "s"}`}
        </span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <ul className="mt-2 space-y-1 text-gray-600">
          {tools.map((t) => (
            <li key={t.id} className="flex items-baseline justify-between gap-2">
              <span className="truncate">
                <span className="font-mono">{t.tool}</span>
                {t.preview ? <span className="ml-1 text-gray-500">{t.preview}</span> : null}
              </span>
              <span
                className={`shrink-0 ${
                  t.state === "error"
                    ? "text-red-600"
                    : t.state === "running"
                      ? "text-gray-500"
                      : "text-gray-400"
                }`}
              >
                {t.state === "running"
                  ? "…"
                  : t.state === "error"
                    ? "failed"
                    : t.durationMs
                      ? `${t.durationMs}ms`
                      : "done"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
