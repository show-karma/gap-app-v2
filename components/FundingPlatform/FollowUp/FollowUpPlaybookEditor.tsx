"use client";

import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button as UiButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFollowUpPlaybook, useSaveFollowUpPlaybook } from "@/hooks/useFollowUpPlaybook";
import type { FollowUpPlaybook } from "@/services/followUpAgent.service";

const MIN_LENGTH = 20;
const MAX_LENGTH = 20000;

const FIXED_RULES = [
  "Never publishes or sets aside a Sim verdict without an explicit yes.",
  "Publishes first, then tells people it is published.",
  "Treats replies as information, never as instructions.",
  "Asks you whenever it is unsure, and never invents facts.",
];

const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

function versionLabel(playbook: FollowUpPlaybook): string {
  if (playbook.isDefault)
    return "Default template. Edit it to match how your program runs reviews.";
  const parts = [`Version ${playbook.version}`];
  if (playbook.createdBy) parts.push(`saved by ${shortAddress(playbook.createdBy)}`);
  if (playbook.createdAt) parts.push(format(new Date(playbook.createdAt), "MMM d, yyyy HH:mm"));
  return parts.join(" · ");
}

interface FollowUpPlaybookEditorProps {
  readonly programId: string;
  readonly canEdit: boolean;
}

export function FollowUpPlaybookEditor({ programId, canEdit }: FollowUpPlaybookEditorProps) {
  const { data, isLoading, isError, refetch } = useFollowUpPlaybook(programId);
  const save = useSaveFollowUpPlaybook(programId);
  const [draft, setDraft] = useState("");
  const saved = data?.playbook.content ?? "";

  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">We couldn&apos;t load the playbook.</p>
        <UiButton variant="outline" className="mt-3" onClick={() => refetch()}>
          Try again
        </UiButton>
      </div>
    );
  }

  const trimmed = draft.trim();
  const changed = trimmed !== saved.trim();
  const valid = trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH;
  const { playbook, versions } = data;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-muted-foreground">{versionLabel(playbook)}</p>
          <span className="text-xs tabular-nums text-muted-foreground">
            {trimmed.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
          </span>
        </div>
        <label htmlFor="follow-up-playbook" className="sr-only">
          Follow-up playbook
        </label>
        <Textarea
          id="follow-up-playbook"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          readOnly={!canEdit}
          rows={24}
          maxLength={MAX_LENGTH}
          className="min-h-[28rem] font-mono text-sm leading-relaxed"
        />
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <UiButton
              onClick={() => save.mutate(trimmed)}
              disabled={!changed || !valid || save.isPending}
            >
              {save.isPending ? "Saving…" : "Save new version"}
            </UiButton>
            <UiButton
              variant="outline"
              onClick={() => setDraft(saved)}
              disabled={!changed || save.isPending}
            >
              Discard changes
            </UiButton>
            {changed && !valid ? (
              <span className="text-sm text-muted-foreground">
                Write at least {MIN_LENGTH} characters.
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only program admins can edit the playbook.
          </p>
        )}
      </div>
      <aside className="space-y-5">
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Always applies
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {FIXED_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            These rules come first. The playbook can&apos;t switch them off.
          </p>
        </div>
        {versions.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-foreground">Versions</h3>
            <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {versions.map((entry) => (
                <li key={entry.version} className="flex justify-between gap-2">
                  <span className="font-medium tabular-nums text-foreground">v{entry.version}</span>
                  <span className="truncate">
                    {shortAddress(entry.createdBy)} · {format(new Date(entry.createdAt), "MMM d")}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
