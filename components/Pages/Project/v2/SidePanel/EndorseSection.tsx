"use client";

import { BadgeCheckIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEndorsementStore } from "@/store/modals/endorsement";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";

interface EndorseSectionProps {
  project: Project;
  className?: string;
}

/**
 * EndorseSection provides an inline endorsement form.
 * Opens EndorsementDialog modal for the actual endorsement flow.
 * Matches Figma design with Lucide icons and neutral color palette.
 */
export function EndorseSection({ project: _project, className }: EndorseSectionProps) {
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const { setIsEndorsementOpen } = useEndorsementStore();

  const handleOpenEndorsementDialog = () => {
    setIsEndorsementOpen(true);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)} data-testid="endorse-section">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <BadgeCheckIcon className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
          <span className="text-xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            Endorse
          </span>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Vouch for this project</p>
      </div>

      {/* Endorse Form */}
      <div className="flex flex-col gap-2">
        {/* Message Textarea */}
        <Textarea
          placeholder="Message*"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full min-h-[72px] resize-none bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-700 rounded-lg shadow-sm"
          data-testid="endorse-message-input"
        />

        {/* Name Input + Submit Button */}
        <div className="flex flex-row gap-2">
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-700 rounded-lg shadow-sm"
            data-testid="endorse-name-input"
          />
          <Button
            onClick={handleOpenEndorsementDialog}
            className="bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg px-3"
            data-testid="endorse-button"
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
