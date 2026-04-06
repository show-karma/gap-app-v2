import { CornerDownLeftIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, memo, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface WidgetInputProps {
  onSubmit: (text: string) => void;
  isStreaming: boolean;
  onStop?: () => void;
  placeholder?: string;
}

export const WidgetInput = memo(function WidgetInput({
  onSubmit,
  isStreaming,
  onStop,
  placeholder = "Ask about Filecoin grants...",
}: WidgetInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSubmit(trimmed);
    setValue("");
    textareaRef.current?.focus();
  }, [value, isStreaming, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit]
  );

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isStreaming}
          rows={1}
          className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 min-h-10 max-h-24"
          aria-label="Chat message"
        />
        {isStreaming ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            aria-label="Stop generating"
            className="shrink-0"
          >
            <SquareIcon className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send message"
            className="shrink-0"
          >
            <CornerDownLeftIcon className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
});
