"use client";

import Link from "next/link";
import type { FC } from "react";
import { AUTO_FOLLOW_UP_LABEL, type SlackAvailability } from "@/components/Inbox/slackAvailability";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utilities/tailwind";

interface AutoFollowUpToggleProps {
  id: string;
  checked: boolean;
  slack: SlackAvailability;
  onCheckedChange: (checked: boolean) => void;
}

export const AutoFollowUpToggle: FC<AutoFollowUpToggleProps> = ({
  id,
  checked,
  slack,
  onCheckedChange,
}) => {
  // A note already opted in can always be opted out, even with Slack gone.
  const locked = slack.status !== "connected" && !checked;
  const showHint = locked && slack.status === "disconnected";
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <label
        htmlFor={id}
        className={cn(
          "flex items-center gap-1.5 text-xs",
          locked
            ? "cursor-not-allowed text-gray-400 dark:text-zinc-500"
            : "cursor-pointer text-gray-500 dark:text-gray-400"
        )}
      >
        <Checkbox
          id={id}
          checked={checked}
          disabled={locked}
          aria-describedby={showHint ? hintId : undefined}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        {AUTO_FOLLOW_UP_LABEL}
      </label>
      {showHint && (
        <span id={hintId} className="text-xs text-gray-400 dark:text-zinc-500">
          <Link
            href={slack.settingsHref}
            className="underline underline-offset-2 hover:text-gray-700 dark:hover:text-zinc-200"
          >
            Connect your Slack
          </Link>{" "}
          to enable
        </span>
      )}
    </div>
  );
};
