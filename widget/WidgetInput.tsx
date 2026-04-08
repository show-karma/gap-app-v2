import { CornerDownLeftIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, memo, useCallback, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

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
  placeholder = "Ask me anything...",
}: WidgetInputProps) {
  const [value, setValue] = useState("");

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSubmit(trimmed);
    setValue("");
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
      <InputGroup>
        <InputGroupTextarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isStreaming}
          className="min-h-10 max-h-24 text-sm"
          aria-label="Chat message"
        />
        <InputGroupAddon align="block-end" className="justify-between gap-1">
          <div />
          {isStreaming ? (
            <InputGroupButton
              variant="outline"
              size="icon-sm"
              onClick={onStop}
              aria-label="Stop generating"
            >
              <SquareIcon className="size-4" />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              variant="default"
              size="icon-sm"
              onClick={submit}
              disabled={!value.trim()}
              aria-label="Send message"
              type="submit"
            >
              <CornerDownLeftIcon className="size-4" />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
});
