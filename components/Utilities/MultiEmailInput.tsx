"use client";

import { XMarkIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utilities/tailwind";

interface MultiEmailInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MultiEmailInput({
  emails,
  onChange,
  placeholder = "Enter email address",
  disabled = false,
  error,
  className,
}: MultiEmailInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const handleAddEmail = () => {
    const trimmedEmail = inputValue.trim().toLowerCase();

    if (!trimmedEmail) {
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setInputError("Please enter a valid email address");
      return;
    }

    if (emails.includes(trimmedEmail)) {
      setInputError("This email is already added");
      return;
    }

    onChange([...emails, trimmedEmail]);
    setInputValue("");
    setInputError(null);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    onChange(emails.filter((email) => email !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex gap-2">
        <Input
          type="email"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setInputError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleAddEmail}
          disabled={disabled || !inputValue.trim()}
        >
          Add
        </Button>
      </div>

      {inputError && <p className="text-sm text-destructive">{inputError}</p>}

      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <div
              key={email}
              className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
            >
              <span>{email}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveEmail(email)}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                  aria-label={`Remove ${email}`}
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
