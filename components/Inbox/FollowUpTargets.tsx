"use client";

import { ArrowRightIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { type FC, useEffect, useRef, useState } from "react";
import { FollowUpTargetDialog } from "@/components/Inbox/FollowUpTargetDialog";
import { describeFollowUpTarget } from "@/components/Inbox/followUpTargetLabel";
import { AUTO_FOLLOW_UP_LABEL, type SlackAvailability } from "@/components/Inbox/slackAvailability";
import { Spinner } from "@/components/Utilities/Spinner";
import { Button } from "@/components/ui/button";
import { type ActionItemTarget, OPTIMISTIC_ID_PREFIX } from "@/hooks/useActionItems";
import { useFollowUpTargets } from "@/hooks/useFollowUpTargets";
import type { FollowUpTarget } from "@/types/follow-up-target";
import type { IMilestoneActionItem } from "@/types/funding-platform";
import { cn } from "@/utilities/tailwind";

interface FollowUpTargetsProps {
  communityId: string;
  target: ActionItemTarget;
  item: IMilestoneActionItem;
  slack: SlackAvailability;
}

function needsAttention(target: FollowUpTarget): boolean {
  return target.kind === "unresolved";
}

/**
 * The "Auto follow-up on Slack → who" line under a note. A freshly saved note
 * has no destination yet, so the first render asks the server to suggest one
 * from the note text; the author can then swap it for another person, a
 * channel or a thread.
 */
export const FollowUpTargets: FC<FollowUpTargetsProps> = ({ communityId, target, item, slack }) => {
  const { suggest, set } = useFollowUpTargets(communityId, target);
  const [editing, setEditing] = useState<number | null>(null);
  const persisted = !item.id.startsWith(OPTIMISTIC_ID_PREFIX);
  const targets = item.followUpTargets;

  const suggestedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!persisted || targets.length > 0 || suggestedFor.current === item.id) return;
    suggestedFor.current = item.id;
    suggest.mutate(item.id);
  }, [persisted, targets.length, item.id, suggest]);

  const pending = suggest.isPending || (persisted && targets.length === 0 && !suggest.isError);

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-gray-500 dark:text-gray-400">
      <span>{AUTO_FOLLOW_UP_LABEL}</span>
      <ArrowRightIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {pending ? (
        <span className="inline-flex items-center gap-1 text-gray-500 dark:text-zinc-400">
          <Spinner className="h-3 w-3" />
          Finding who to message…
        </span>
      ) : suggest.isError ? (
        <Button
          variant="link"
          size="sm"
          onClick={() => suggest.mutate(item.id)}
          className="h-auto p-0 text-[11px] font-normal text-gray-500 dark:text-gray-400"
        >
          Couldn&apos;t suggest a recipient. Try again
        </Button>
      ) : (
        targets.map((entry, index) => (
          <TargetChip
            key={`${entry.kind}-${index}`}
            target={entry}
            slack={slack}
            onChange={() => setEditing(index)}
          />
        ))
      )}
      {editing !== null && (
        <FollowUpTargetDialog
          communityId={communityId}
          item={item}
          replaceIndex={editing}
          isSaving={set.isPending}
          error={set.error}
          onClose={() => {
            set.reset();
            setEditing(null);
          }}
          onSave={(inputs) =>
            set.mutate({ itemId: item.id, targets: inputs }, { onSuccess: () => setEditing(null) })
          }
        />
      )}
    </span>
  );
};

const TargetChip: FC<{
  target: FollowUpTarget;
  slack: SlackAvailability;
  onChange: () => void;
}> = ({ target, slack, onChange }) => {
  const attention = needsAttention(target);
  if (target.kind === "unresolved" && target.reason === "author_not_connected") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
        <ExclamationTriangleIcon className="h-3 w-3" aria-hidden="true" />
        <Link href={slack.settingsHref} className="underline underline-offset-2">
          Connect your Slack
        </Link>{" "}
        to send
      </span>
    );
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onChange}
      aria-label={
        attention
          ? `Choose who receives this follow-up (${describeFollowUpTarget(target)})`
          : `Change follow-up destination, currently ${describeFollowUpTarget(target)}`
      }
      className={cn(
        "h-auto max-w-full gap-1 rounded-full border px-2 py-0.5 text-[11px] font-normal leading-4",
        attention
          ? "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-400"
      )}
    >
      {attention && <ExclamationTriangleIcon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span className="truncate">{describeFollowUpTarget(target)}</span>
      <span className="shrink-0 text-gray-500 dark:text-zinc-400">
        {attention ? "· choose" : "· change"}
      </span>
    </Button>
  );
};
