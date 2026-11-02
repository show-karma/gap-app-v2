"use client";

import { type FC, useCallback, useState } from "react";
import { AutoFollowUpToggle } from "@/components/Inbox/AutoFollowUpToggle";
import { NoteEditor } from "@/components/Inbox/NoteEditor";
import type { SlackAvailability } from "@/components/Inbox/slackAvailability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ICommunityActionItem, IMilestoneActionItem } from "@/types/funding-platform";
import { calendarDayToIso, isoToCalendarDay } from "@/utilities/calendarDay";

export interface ActionItemEditInput {
  content: string;
  followUpAt: string;
  autoFollowUp: boolean;
}

interface ActionItemEditFormProps {
  item: IMilestoneActionItem;
  slack: SlackAvailability;
  mentionOptions: ICommunityActionItem[];
  isLoadingMentions: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (input: ActionItemEditInput) => void;
}

export const ActionItemEditForm: FC<ActionItemEditFormProps> = ({
  item,
  slack,
  mentionOptions,
  isLoadingMentions,
  isSaving,
  onCancel,
  onSave,
}) => {
  const [content, setContent] = useState(item.content);
  const [followUp, setFollowUp] = useState(() => isoToCalendarDay(item.followUpAt));
  const [autoFollowUp, setAutoFollowUp] = useState(item.autoFollowUp);

  const save = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || !followUp) return;
    onSave({ content: trimmed, followUpAt: calendarDayToIso(followUp), autoFollowUp });
  }, [content, followUp, autoFollowUp, onSave]);

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <NoteEditor
        value={content}
        onChange={setContent}
        mentionOptions={mentionOptions}
        isLoadingMentions={isLoadingMentions}
        excludeNoteId={item.id}
        aria-label="Action item note"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label
          htmlFor={`action-item-edit-follow-up-${item.id}`}
          className="text-xs text-gray-500 dark:text-gray-400"
        >
          Next follow-up <span className="text-red-500">*</span>
        </label>
        <Input
          id={`action-item-edit-follow-up-${item.id}`}
          type="date"
          required
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          className="h-8 w-auto"
        />
        <AutoFollowUpToggle
          id={`action-item-edit-auto-follow-up-${item.id}`}
          checked={autoFollowUp}
          slack={slack}
          onCheckedChange={setAutoFollowUp}
        />
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={!content.trim() || !followUp || isSaving}
            isLoading={isSaving}
          >
            Save
          </Button>
        </div>
      </div>
    </li>
  );
};
