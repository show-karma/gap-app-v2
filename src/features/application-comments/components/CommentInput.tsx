"use client";

import { Send } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { CommentInputProps } from "../types";
import { CommentMarkdownInput } from "./CommentMarkdownInput";

export function CommentInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Add a comment... (Ctrl+Enter to send)",
  disabled = false,
  isLoading = false,
}: CommentInputProps) {
  const handleSubmit = useCallback(async () => {
    if (!value.trim() || disabled || isLoading) return;
    await onSubmit();
  }, [value, disabled, isLoading, onSubmit]);

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <CommentMarkdownInput
          value={value}
          onChange={onChange}
          onSubmit={handleSubmit}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          minHeight={100}
          maxHeight={200}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          isLoading={isLoading}
          aria-label="Send"
          className="h-full"
        >
          <Send className="w-4 h-4" />
          Send
        </Button>
      </div>
    </div>
  );
}
