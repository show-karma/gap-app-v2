"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useAskQuestions,
  useDiligenceTemplate,
  useOutreachPreview,
  useSaveDiligenceTemplate,
} from "@/hooks/useDiligence";
import { isDiligenceQuotaExhausted } from "@/services/donor-research-billing.service";
import type { CandidateDiligenceView, DiligenceQuestion } from "@/types/diligence";
import { DILIGENCE_TEMPLATE_LIMITS } from "@/types/diligence";
import { PAGES } from "@/utilities/pages";
import { UpgradeDialog } from "../../billing/UpgradeDialog";
import { OutreachEmailPreview } from "./OutreachEmailPreview";
import { getOutreachBodyIssue } from "./outreach-body";
import { NO_CONTACT_FOUND_MESSAGE } from "./outreach-messages";
import { makeQuestionId } from "./question-id";
import type { DiligenceViewer } from "./viewer";

interface AskQuestionsDialogProps {
  reportId: string;
  candidateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: CandidateDiligenceView;
  /** Nonprofit display name for the preview's To row (null → row hidden). */
  candidateName?: string | null;
  /** The report's owner, or a super-admin acting as them. */
  viewer: DiligenceViewer;
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
  viewer,
}: AskQuestionsDialogProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <>
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
              viewer={viewer}
              onClose={() => onOpenChange(false)}
              onQuotaExhausted={() => {
                onOpenChange(false);
                setUpgradeOpen(true);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Mounted only while open — the dialog owns billing queries that a
          closed prompt has no reason to run. */}
      {upgradeOpen ? (
        <UpgradeDialog
          dimension="diligence"
          onOpenChange={setUpgradeOpen}
          open
          reason="You've used all the diligence rounds on your plan. Upgrade to send more."
        />
      ) : null}
    </>
  );
}

interface AskQuestionsBodyProps {
  reportId: string;
  candidateId: string;
  view: CandidateDiligenceView;
  candidateName: string | null;
  viewer: DiligenceViewer;
  onClose: () => void;
  /** Raised on a 402 diligence-quota refusal so the parent can offer plans. */
  onQuotaExhausted: () => void;
}

function AskQuestionsBody({
  reportId,
  candidateId,
  view,
  candidateName,
  viewer,
  onClose,
  onQuotaExhausted,
}: AskQuestionsBodyProps) {
  // The template is only consulted for the empty guard — the email content
  // itself always comes from the backend preview, which composes from the
  // live template exactly as delivery would. Read it through the REPORT so a
  // super-admin sees the owner's questions (the ones the preview composes
  // from), not their own — which they may not even have.
  const templateQuery = useDiligenceTemplate(reportId);
  const askQuestions = useAskQuestions();

  const hasFrozenRequest = (view.request?.questions.length ?? 0) > 0;
  const isTemplateLoading = !hasFrozenRequest && templateQuery.isLoading;
  const isTemplateError = !hasFrozenRequest && templateQuery.isError;
  const isTemplateEmpty =
    !hasFrozenRequest &&
    !isTemplateLoading &&
    !isTemplateError &&
    (templateQuery.data?.questions.length ?? 0) === 0;

  // Enable the preview only once we KNOW questions exist (frozen request or
  // loaded template) — never speculatively while the template is loading, so
  // first-run empty-template users don't fire a preview they'll never see.
  const shouldLoadPreview =
    hasFrozenRequest ||
    (!isTemplateLoading && !isTemplateError && (templateQuery.data?.questions.length ?? 0) > 0);
  const previewQuery = useOutreachPreview(reportId, candidateId, "diligence", shouldLoadPreview);
  const preview = previewQuery.data;

  // null = untouched; the textarea always shows the draft once one exists so
  // edits survive a background preview refetch. Edited-ness compares TRIMMED
  // text — a whitespace-only tweak still sends the backend default.
  const [draft, setDraft] = useState<string | null>(null);
  const body = draft ?? preview?.bodyText ?? "";
  const isEdited =
    draft !== null && preview !== undefined && body.trim() !== preview.bodyText.trim();

  const canSend =
    view.actions.canAskQuestions &&
    !isTemplateEmpty &&
    preview !== undefined &&
    getOutreachBodyIssue(body) === null;

  const handleSend = () => {
    askQuestions.mutate(
      { reportId, candidateId, ...(isEdited ? { body: body.trim() } : {}) },
      {
        onSuccess: (result) => {
          // A 202 can still end `blocked` (no contact could be resolved for
          // the nonprofit) — nothing was or will be emailed, so a success
          // toast would contradict the "Couldn't reach" badge the card is
          // about to show.
          if (result.coarseStatus === "blocked") {
            toast.error(NO_CONTACT_FOUND_MESSAGE);
          } else {
            toast.success("Questions sent");
          }
          onClose();
        },
        onError: (error) => {
          // Out of diligence rounds is a purchasing decision, not a failure.
          if (isDiligenceQuotaExhausted(error)) {
            onQuotaExhausted();
            return;
          }
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
            <p className="text-sm text-muted-foreground">{TEMPLATE_ERROR_COPY[viewer]}</p>
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
          <InlineQuestionSetup reportId={reportId} viewer={viewer} />
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
            hint={BODY_EDIT_HINT_COPY[viewer]}
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

/**
 * Copy that differs for a super-admin acting on the owner's behalf: the
 * questions being sent are the OWNER's, so "your" would be wrong.
 */
const TEMPLATE_ERROR_COPY: Record<DiligenceViewer, string> = {
  owner: "Couldn't load your questions.",
  staff: "Couldn't load the report owner's questions.",
};

const BODY_EDIT_HINT_COPY: Record<DiligenceViewer, string> = {
  owner:
    "Editing the questions here changes the email text only — the answer form uses your saved question template.",
  staff:
    "Editing the questions here changes the email text only — the answer form uses the report owner's saved question template.",
};

const EMPTY_TEMPLATE_COPY: Record<DiligenceViewer, string> = {
  owner:
    "You haven't added any diligence questions yet. Write them here — they're saved to your question template and dropped into the email.",
  staff:
    "This report's owner hasn't added any diligence questions yet. Write them here — they're saved to the owner's question template and dropped into the email.",
};

const TEMPLATE_SAVED_COPY: Record<DiligenceViewer, string> = {
  owner: "Questions saved to your template",
  staff: "Questions saved to the report owner's template",
};

const TEMPLATE_SAVE_FAILED_COPY: Record<DiligenceViewer, string> = {
  owner: "Couldn't save your questions. Please try again.",
  staff: "Couldn't save the report owner's questions. Please try again.",
};

const { MAX_QUESTIONS, QUESTION_TEXT_MAX } = DILIGENCE_TEMPLATE_LIMITS;

interface InlineQuestionSetupProps {
  /** Scopes the save to the report OWNER's template, not the caller's. */
  reportId: string;
  viewer: DiligenceViewer;
}

/**
 * First-run question capture inside the dialog: lets the advisor write the
 * diligence questions right here instead of detouring to the template page
 * (which stays available via the link below, for the owner — a super-admin's
 * own template page would edit the wrong row, so they don't get the link).
 * Saving goes through the report-scoped template save, and the seeded cache
 * flips the dialog straight into the email preview — blank rows are dropped,
 * so only real questions persist.
 */
function InlineQuestionSetup({ reportId, viewer }: InlineQuestionSetupProps) {
  const save = useSaveDiligenceTemplate(reportId);
  const [rows, setRows] = useState<DiligenceQuestion[]>(() => [{ id: makeQuestionId(), text: "" }]);

  const filled = rows.filter((row) => row.text.trim().length > 0);
  const hasTooLong = rows.some((row) => row.text.trim().length > QUESTION_TEXT_MAX);
  const canSave = filled.length > 0 && !hasTooLong && !save.isPending;

  const updateRow = useCallback((id: string, text: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, text } : row)));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const addRow = () => {
    setRows((prev) =>
      prev.length >= MAX_QUESTIONS ? prev : [...prev, { id: makeQuestionId(), text: "" }]
    );
  };

  const handleSave = () => {
    save.mutate(
      { questions: filled.map((row) => ({ id: row.id, text: row.text.trim() })) },
      {
        onSuccess: () => {
          toast.success(TEMPLATE_SAVED_COPY[viewer]);
        },
        onError: () => {
          toast.error(TEMPLATE_SAVE_FAILED_COPY[viewer]);
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3">
      <p className="text-sm text-muted-foreground">{EMPTY_TEMPLATE_COPY[viewer]}</p>

      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <InlineQuestionRow
            key={row.id}
            row={row}
            index={index}
            removable={rows.length > 1}
            disabled={save.isPending}
            onChangeText={updateRow}
            onRemove={removeRow}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addRow}
          disabled={save.isPending || rows.length >= MAX_QUESTIONS}
        >
          <Plus className="size-4" aria-hidden />
          Add another question
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!canSave}
          isLoading={save.isPending}
        >
          Save questions
        </Button>
      </div>

      {viewer === "owner" ? (
        <Link
          href={PAGES.DONOR_RESEARCH.DILIGENCE_TEMPLATE}
          className="text-sm font-medium text-brand-emphasis underline-offset-2 hover:underline dark:text-brand-subtle"
        >
          Edit your question template
        </Link>
      ) : null}
    </div>
  );
}

interface InlineQuestionRowProps {
  row: DiligenceQuestion;
  index: number;
  removable: boolean;
  disabled: boolean;
  onChangeText: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}

/** One editable question row; memoized since it renders inside a map. */
const InlineQuestionRow = memo(function InlineQuestionRow({
  row,
  index,
  removable,
  disabled,
  onChangeText,
  onRemove,
}: InlineQuestionRowProps) {
  const tooLong = row.text.trim().length > QUESTION_TEXT_MAX;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <Textarea
          aria-label={`Question ${index + 1}`}
          placeholder="e.g. What is your annual operating budget?"
          value={row.text}
          onChange={(event) => onChangeText(row.id, event.target.value)}
          disabled={disabled}
          className="min-h-[40px]"
          rows={1}
        />
        {removable ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Remove question ${index + 1}`}
            onClick={() => onRemove(row.id)}
            disabled={disabled}
          >
            <X className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      {tooLong ? (
        <p className="text-sm text-destructive">
          Use {QUESTION_TEXT_MAX.toLocaleString("en-US")} characters or fewer.
        </p>
      ) : null}
    </div>
  );
});
