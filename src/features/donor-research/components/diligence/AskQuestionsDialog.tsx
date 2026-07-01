"use client";

import Link from "next/link";
import pluralize from "pluralize";
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
import { useAskQuestions, useDiligenceTemplate } from "@/hooks/useDiligence";
import type { CandidateDiligenceView, DiligenceQuestion } from "@/types/diligence";
import { PAGES } from "@/utilities/pages";

interface AskQuestionsDialogProps {
  reportId: string;
  candidateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: CandidateDiligenceView;
}

/**
 * Confirms an ANONYMOUS diligence request. Karma emails the nonprofit the
 * org-facing questions only — never the advisor's identity.
 *
 * The questions previewed are the FROZEN snapshot when a request already
 * exists (`view.request.questions`), otherwise the advisor's current template.
 */
export function AskQuestionsDialog({
  reportId,
  candidateId,
  open,
  onOpenChange,
  view,
}: AskQuestionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* The portal only mounts children when open, so the template fetch in
            AskQuestionsBody runs lazily — never for closed/unopened dialogs. */}
        {open ? (
          <AskQuestionsBody
            reportId={reportId}
            candidateId={candidateId}
            view={view}
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
  onClose: () => void;
}

function AskQuestionsBody({ reportId, candidateId, view, onClose }: AskQuestionsBodyProps) {
  const frozen = view.request?.questions ?? null;
  const templateQuery = useDiligenceTemplate();
  const askQuestions = useAskQuestions();

  const questions: DiligenceQuestion[] = frozen ?? templateQuery.data?.questions ?? [];
  const isLoadingTemplate = !frozen && templateQuery.isLoading;
  const isTemplateError = !frozen && templateQuery.isError;
  const isEmpty = !isLoadingTemplate && !isTemplateError && questions.length === 0;
  const canSend = view.actions.canAskQuestions && questions.length > 0;

  const handleSend = () => {
    askQuestions.mutate(
      { reportId, candidateId },
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
          Karma emails this nonprofit your questions. Your identity is never shared — they only see
          that a funder is interested.
        </DialogDescription>
      </DialogHeader>

      <div className="py-1">
        {isLoadingTemplate ? (
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
        ) : isEmpty ? (
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
          <>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {questions.length} {pluralize("question", questions.length)} will be sent
            </p>
            <ol className="flex flex-col gap-2">
              {questions.map((question, index) => (
                <li key={question.id} className="flex gap-2 text-sm text-foreground">
                  <span className="tabular-nums text-muted-foreground">{index + 1}.</span>
                  <span className="flex-1">{question.text}</span>
                </li>
              ))}
            </ol>
          </>
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
