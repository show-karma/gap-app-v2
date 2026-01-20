"use client";

import { StarIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEndorsementStore } from "@/store/modals/endorsement";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";

interface EndorseSectionProps {
  project: Project;
  onSubmit?: (message: string, name: string) => void;
  className?: string;
}

/**
 * EndorseSection provides an inline endorsement form.
 * Opens the EndorsementDialog for the full endorsement flow.
 */
export function EndorseSection({
  project: _project,
  onSubmit: _onSubmit,
  className,
}: EndorseSectionProps) {
  const [message, setMessage] = useState("");
  const [_name, _setName] = useState("");
  const { setIsEndorsementOpen } = useEndorsementStore();

  const handleOpenEndorsementDialog = () => {
    setIsEndorsementOpen(true);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800",
        className
      )}
      data-testid="endorse-section"
    >
      {/* Header */}
      <div className="flex flex-row items-center gap-2">
        <StarIcon className="h-5 w-5 text-yellow-500" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          Endorse this project
        </span>
      </div>

      {/* Message Textarea */}
      <Textarea
        placeholder="Why do you endorse this project? (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full min-h-[80px] resize-none"
        data-testid="endorse-message-input"
      />

      {/* Endorse Button */}
      <Button
        onClick={handleOpenEndorsementDialog}
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
        data-testid="endorse-button"
      >
        Endorse
      </Button>
    </div>
  );
}
