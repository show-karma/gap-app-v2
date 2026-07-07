"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAskQuestions, useDiligenceTemplate, useOutreachPreview } from "@/hooks/useDiligence";
import type { CandidateDiligenceView } from "@/types/diligence";
import { PAGES } from "@/utilities/pages";
import { getOutreachBodyIssue, OutreachEmailPreview } from "./OutreachEmailPreview";

interface AskQuestionsDialogProps {
  reportId: string;
  candidateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: CandidateDiligenceView;
  /** Nonprofit display name for the preview's To row (null → row hidden). */
  candidateName?: string | null;
}

/**
 * Confirms an ANONYMOUS diligence request. Karma emails the nonprofit the
 * org-facing questions only — never the advisor's identity.
 *
 * Before sending, the advisor sees the ENTIRE email (DEV-500): the backend
 * composes the exact default body (template questions embedded as numbered
 * lines) and the advisor may edit it. An untouched body POSTs without `body`
 * so the backend renders its own default.
 */
export function AskQuestionsDialog({
  reportId,
  candidateId,
  open,
  onOpenChange,
  view,
  candidateName,
}: AskQuestionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        {/* The portal only mounts children when open, so the template/preview
            fetches in AskQuestionsBody run lazily — never for closed dialogs —
            and the edited-body draft resets on close via unmount. */}
        {open ? (
          <AskQuestionsBody
            reportId={reportId}
            candidateId={candidateId}
            view={view}
            candidateName={candidateName ?? null}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface AskQuestionsBodyProps {
  reportId: string;
  candidateId: string;
  view: CandidateDiligenceView;
  candidateName: string | null;
  onClose: () => void;
}

function AskQuestionsBody({
  reportId,
  candidateId,
  view,
  candidateName,
  onClose,
}: AskQuestionsBodyProps) {
  // The template is only consulted for the empty guard — the email content
  // itself always comes from the backend preview, which composes from the
  // live template exactly as delivery would.
  const templateQuery = useDiligenceTemplate();
  const askQuestions = useAskQuestions();

  const hasFrozenRequest = (view.request?.questions.length ?? 0) > 0;
  const isTemplateLoading = !hasFrozenRequest && templateQuery.isLoading;
  const isTemplateError = !hasFrozenRequest && templateQuery.isError;
  const isTemplateEmpty =
    !hasFrozenRequest &&
    !isTemplateLoading &&
    !isTemplateError &&
    (templateQuery.data?.questions.length ?? 0) === 0;

  const previewQuery = useOutreachPreview(reportId, candidateId, "diligence", !isTemplateEmpty);
  const preview = previewQuery.data;

  // null = untouched; the textarea always shows the draft once one exists so
  // edits survive a background preview refetch.
  const [draft, setDraft] = useState<string | null>(null);
  const body = draft ?? preview?.bodyText ?? "";
  const isEdited = draft !== null && preview !== undefined && draft !== preview.bodyText;

  const canSend =
    view.actions.canAskQuestions &&
    !isTemplateEmpty &&
    preview !== undefined &&
    getOutreachBodyIssue(body) === null;

  const handleSend = () => {
    askQuestions.mutate(
      { reportId, candidateId, ...(isEdited ? { body: body.trim() } : {}) },
      {
        onSuccess: () => {
          toast.success("Questions sent");
          onClose();
        },
        onError: () => {
          toast.error("Couldn't send the questions. Please try again.");
        },
      }
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ask questions anonymously</DialogTitle>
        <DialogDescription>
          Karma emails this nonprofit the message below. Your identity is never shared — they only
          see that a funder is interested. Review the email and edit it if needed before sending.
        </DialogDescription>
      </DialogHeader>

      <div className="py-1">
        {isTemplateLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : isTemplateError ? (
          <div className="flex flex-col items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground">Couldn't load your questions.</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => templateQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : isTemplateEmpty ? (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground">
              You haven't added any diligence questions yet. Add questions to your template before
              you can send them.
            </p>
            <Link
              href={PAGES.DONOR_RESEARCH.DILIGENCE_TEMPLATE}
              className="text-sm font-medium text-brand-emphasis underline-offset-2 hover:underline dark:text-brand-subtle"
            >
              Edit your question template
            </Link>
          </div>
        ) : (
          <OutreachEmailPreview
            preview={preview}
            isLoading={previewQuery.isLoading}
            isError={previewQuery.isError}
            onRetry={() => previewQuery.refetch()}
            toName={candidateName}
            body={body}
            onBodyChange={setDraft}
            idPrefix="ask-questions"
            hint="Editing the questions here changes the email text only — the answer form uses your saved question template."
          />
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSend}
          disabled={!canSend || askQuestions.isPending}
          isLoading={askQuestions.isPending}
        >
          Send questions
        </Button>
      </DialogFooter>
    </>
  );
}
