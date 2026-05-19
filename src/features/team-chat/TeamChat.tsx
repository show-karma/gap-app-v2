"use client";

import { CornerDownLeftIcon, SquareIcon, X } from "lucide-react";
import { type KeyboardEvent, memo, useCallback, useEffect, useRef, useState } from "react";
import { type ChatMessage, useChat } from "@/hooks/useChat";
import { useUploadChatFile } from "@/hooks/useUploads";
import { type HermesUploadSummary, TEAM_ROLE_LABELS, type TeamRole } from "@/lib/hermes-client";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/src/components/ai-elements/conversation";
import { Message, MessageContent } from "@/src/components/ai-elements/message";
import { MessageResponse } from "@/src/components/ai-elements/message-response";
import { UploadButton } from "@/src/features/uploads/UploadButton";

interface Props {
  slug: string;
  role: TeamRole;
}

export function TeamChat({ slug, role }: Props) {
  const { messages, sending, send, stop } = useChat(slug, role);

  // Pending attachments live on the composer until sent — once the user
  // hits send, they're inlined into the message text as file paths so
  // the agent can read them via Hermes' file tool. The blob itself stays
  // on disk (content-addressed) so the same file isn't re-uploaded if
  // they want to reference it again.
  const [pending, setPending] = useState<HermesUploadSummary[]>([]);

  const handleSubmit = useCallback(
    (text: string) => {
      if (sending) return;
      const attachmentLines = pending.map(
        (f) => `[Attached file: ${f.filename} (sha256:${f.sha256})]`
      );
      const composed = [...attachmentLines, text].filter(Boolean).join("\n");
      if (!composed) return;
      send(composed);
      setPending([]);
    },
    [sending, send, pending]
  );

  return (
    <div className="flex h-[72vh] flex-col rounded-lg border dark:border-zinc-800 bg-white dark:bg-zinc-900">
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

      <div className="border-t dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-800/60 p-3">
        <ChatComposer
          slug={slug}
          role={role}
          placeholder={`Message ${TEAM_ROLE_LABELS[role]}`}
          isStreaming={sending}
          onSubmit={handleSubmit}
          onStop={stop}
          pending={pending}
          onAttach={(f) => setPending((cur) => [...cur, f])}
          onRemoveAttachment={(sha) => setPending((cur) => cur.filter((f) => f.sha256 !== sha))}
        />
      </div>
    </div>
  );
}

const ChatTurn = memo(function ChatTurn({
  message,
  role,
}: {
  message: ChatMessage;
  role: TeamRole;
}) {
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
              <div className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
                Stopped by you. {TEAM_ROLE_LABELS[role]} can pick up from here.
              </div>
            ) : null}
          </>
        )}
      </MessageContent>
    </Message>
  );
});

function StreamingPulse() {
  return (
    <output
      aria-label="thinking"
      className="ml-0.5 inline-block h-3 w-1.5 animate-pulse rounded bg-gray-400 dark:bg-zinc-500 align-middle"
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
    <div className="mb-3 rounded border border-gray-200 dark:border-zinc-700 bg-gray-50/80 dark:bg-zinc-800/80 px-3 py-2 text-xs">
      <ul className="space-y-1 text-gray-700 dark:text-zinc-300">
        {tools.map((t) => (
          <li key={t.id} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex-1 truncate">
              <span className="font-mono text-gray-800 dark:text-zinc-200">{t.tool}</span>
              {t.preview ? (
                <span className="ml-2 text-gray-500 dark:text-zinc-400">{t.preview}</span>
              ) : null}
            </span>
            <ToolDuration tool={t} />
          </li>
        ))}
      </ul>
      {isStreaming ? (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-500">
          <span className="h-1 w-1 animate-pulse rounded-full bg-gray-400 dark:bg-zinc-500 [animation-delay:0ms]" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-gray-400 dark:bg-zinc-500 [animation-delay:150ms]" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-gray-400 dark:bg-zinc-500 [animation-delay:300ms]" />
        </div>
      ) : null}
    </div>
  );
}

function ToolDuration({ tool }: { tool: NonNullable<ChatMessage["tools"]>[number] }) {
  if (tool.state === "running") {
    return <span className="shrink-0 text-gray-500 dark:text-zinc-400">running…</span>;
  }
  if (tool.state === "error") {
    return <span className="shrink-0 text-red-600">failed</span>;
  }
  return (
    <span className="shrink-0 text-gray-400 dark:text-zinc-500">
      {tool.durationMs ? `${tool.durationMs}ms` : "done"}
    </span>
  );
}

interface ComposerProps {
  slug: string;
  role: TeamRole;
  placeholder: string;
  isStreaming: boolean;
  onSubmit: (text: string) => void;
  onStop: () => void;
  pending: HermesUploadSummary[];
  onAttach: (file: HermesUploadSummary) => void;
  onRemoveAttachment: (sha256: string) => void;
}

function ChatComposer({
  slug,
  role,
  placeholder,
  isStreaming,
  onSubmit,
  onStop,
  pending,
  onAttach,
  onRemoveAttachment,
}: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const upload = useUploadChatFile(slug, role);

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
    // Allow send when there's text OR pending attachments — attachment-only
    // messages are valid ("here's the file, look at it").
    if (!text && pending.length === 0) return;
    if (isStreaming) return;
    onSubmit(text);
    setValue("");
    requestAnimationFrame(resize);
  }, [value, isStreaming, onSubmit, resize, pending.length]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      submit();
    }
  };

  const canSubmit = (value.trim().length > 0 || pending.length > 0) && !isStreaming;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 focus-within:border-gray-400 dark:focus-within:border-zinc-500">
      {pending.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5 border-b border-gray-100 dark:border-zinc-700 pb-2">
          {pending.map((f) => (
            <li
              key={f.sha256}
              className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px]"
            >
              <span className="max-w-[160px] truncate font-medium text-gray-800 dark:text-zinc-200">
                {f.filename}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(f.sha256)}
                className="rounded p-0.5 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-zinc-100"
                aria-label={`Remove ${f.filename}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-end gap-2">
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
          className="min-h-[24px] flex-1 resize-none border-0 bg-transparent text-sm leading-6 text-gray-900 dark:text-zinc-100 outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-500"
        />
        <UploadButton
          label=""
          isUploading={upload.isPending}
          onSelect={(file) => upload.mutate(file, { onSuccess: onAttach })}
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-gray-700 dark:hover:bg-zinc-200"
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
    </div>
  );
}
