"use client";

import { SendIcon, SquareIcon } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useCallback, useState } from "react";
import { cn } from "@/utilities/tailwind";

interface AskKarmaInputProps {
  onSubmit: (text: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  placeholder?: string;
}

// Hard cap on a single chat turn. Generous (~1k tokens of English) but
// prevents pasted-document-sized prompts from being submitted accidentally.
const CHAT_INPUT_MAX_LENGTH = 4000;

export function AskKarmaInput({
  onSubmit,
  onStop,
  isStreaming,
  placeholder = "Type your message...",
}: AskKarmaInputProps) {
  const [value, setValue] = useState("");

  const send = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSubmit(trimmed);
    setValue("");
  }, [isStreaming, onSubmit, value]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      send();
    },
    [send]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      // CJK / IME users press Enter to confirm a composition candidate;
      // without this guard, that confirmation also submits the half-typed
      // message and breaks the input for those locales.
      if (event.nativeEvent.isComposing) return;
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        send();
      }
    },
    [send]
  );

  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative flex w-full items-end gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2",
        "shadow-sm transition-all duration-200 ease-out",
        "hover:border-zinc-300 hover:shadow-md",
        "focus-within:border-[rgb(var(--color-primary))] focus-within:ring-2 focus-within:ring-[rgb(var(--color-primary))]/30",
        "focus-within:shadow-[0_0_0_4px_rgba(167,243,208,0.15)]",
        "dark:border-zinc-800 dark:bg-zinc-900",
        "dark:hover:border-zinc-700 dark:focus-within:border-[rgb(var(--color-primary-dark))] dark:focus-within:ring-[rgb(var(--color-primary-dark))]/30"
      )}
    >
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        maxLength={CHAT_INPUT_MAX_LENGTH}
        placeholder={placeholder}
        aria-label="Message AI Assistant"
        className={cn(
          "max-h-40 min-h-[24px] flex-1 resize-none bg-transparent text-sm",
          "text-zinc-900 placeholder:text-zinc-400 outline-none",
          "transition-colors duration-200",
          "dark:text-zinc-50 dark:placeholder:text-zinc-500"
        )}
      />
      {isStreaming && onStop ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop response"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            "bg-zinc-200 text-zinc-700 transition-all duration-200 ease-out",
            "animate-in zoom-in-90 fade-in",
            "hover:scale-110 hover:bg-zinc-300 active:scale-90",
            "dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
          )}
        >
          <SquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ease-out",
            "active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100",
            canSend
              ? "bg-[rgb(var(--color-primary))] text-white shadow-sm hover:scale-110 hover:bg-[rgb(var(--color-primary-dark))] hover:shadow-md dark:bg-[rgb(var(--color-primary))] dark:hover:bg-[rgb(var(--color-primary-light))]"
              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
          )}
        >
          <SendIcon
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              canSend ? "group-active:rotate-12" : ""
            )}
            aria-hidden="true"
          />
        </button>
      )}
    </form>
  );
}
