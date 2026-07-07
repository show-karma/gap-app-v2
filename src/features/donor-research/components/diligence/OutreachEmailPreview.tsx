"use client";

import { Info, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { OutreachPreview } from "@/types/diligence";
import { OUTREACH_BODY_LIMITS } from "@/types/diligence";

/**
 * Why the edited body is invalid for sending, mirroring the backend's
 * `OutreachActionBodySchema` (trimmed, 1..10,000 chars). `null` means the body
 * is sendable.
 */
export type OutreachBodyIssue = "empty" | "over_limit" | null;

export function getOutreachBodyIssue(body: string): OutreachBodyIssue {
  const trimmedLength = body.trim().length;
  if (trimmedLength === 0) return "empty";
  if (trimmedLength > OUTREACH_BODY_LIMITS.MAX_CHARS) return "over_limit";
  return null;
}

interface OutreachEmailPreviewProps {
  preview: OutreachPreview | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** Nonprofit display name for the To row; the row is hidden when unknown. */
  toName: string | null;
  /** Current body value — the caller resolves draft ?? preview.bodyText. */
  body: string;
  onBodyChange: (value: string) => void;
  /** Unique per host dialog so the textarea label ids never collide. */
  idPrefix: string;
  /** Optional extra note under the body (e.g. the questions-snapshot hint). */
  hint?: ReactNode;
}

/**
 * The email-shaped preview-and-edit block shared by the Ask Questions and
 * Connect dialogs (DEV-500): read-only To/Subject rows, an editable plain-text
 * body, and the non-editable footer the system appends at send time. Never
 * renders null — loading and error both have explicit states, and sending is
 * impossible until a preview has loaded (callers gate on `preview`).
 */
export function OutreachEmailPreview({
  preview,
  isLoading,
  isError,
  onRetry,
  toName,
  body,
  onBodyChange,
  idPrefix,
  hint,
}: OutreachEmailPreviewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !preview) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
        <p className="text-sm text-muted-foreground">Couldn't load the email preview.</p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  const bodyId = `${idPrefix}-outreach-body`;
  const issue = getOutreachBodyIssue(body);
  const trimmedLength = body.trim().length;
  const showCounter = trimmedLength > OUTREACH_BODY_LIMITS.COUNTER_THRESHOLD;

  return (
    <div className="flex flex-col gap-3">
      {toName ? <ReadOnlyRow label="To" value={toName} /> : null}
      <ReadOnlyRow label="Subject" value={preview.subject} locked />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={bodyId}>Email body</Label>
        <Textarea
          id={bodyId}
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          className="min-h-[220px] max-h-[45vh] whitespace-pre-wrap leading-relaxed"
          aria-invalid={issue !== null ? "true" : undefined}
        />
        {issue === "over_limit" ? (
          <p className="text-sm text-destructive">
            The email body can't exceed {OUTREACH_BODY_LIMITS.MAX_CHARS.toLocaleString("en-US")}{" "}
            characters.
          </p>
        ) : issue === "empty" ? (
          <p className="text-sm text-destructive">The email body can't be empty.</p>
        ) : null}
        {showCounter ? (
          <p
            className={`text-right text-xs tabular-nums ${
              issue === "over_limit" ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {trimmedLength.toLocaleString("en-US")} /{" "}
            {OUTREACH_BODY_LIMITS.MAX_CHARS.toLocaleString("en-US")}
          </p>
        ) : null}
      </div>

      {preview.fixedFooter ? (
        <p className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-2.5 text-xs italic text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{preview.fixedFooter}</span>
        </p>
      ) : null}

      {hint ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{hint}</span>
        </p>
      ) : null}
    </div>
  );
}

interface ReadOnlyRowProps {
  label: string;
  value: string;
  locked?: boolean;
}

/** A muted, visibly non-editable header row (To / Subject). */
function ReadOnlyRow({ label, value, locked = false }: ReadOnlyRowProps) {
  return (
    <div className="flex items-baseline gap-2 rounded-md bg-muted/40 px-3 py-2">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span className="flex-1 text-sm text-foreground">{value}</span>
      {locked ? <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </div>
  );
}
