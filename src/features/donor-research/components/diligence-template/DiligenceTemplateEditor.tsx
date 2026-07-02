"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, GripVertical, Plus, Trash2 } from "lucide-react";
import pluralize from "pluralize";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useDiligenceTemplate, useSaveDiligenceTemplate } from "@/hooks/useDiligence";
import { Link } from "@/src/components/navigation/Link";
import { DonorResearchLoading } from "@/src/features/donor-research/components/common/DonorResearchLoading";
import { DILIGENCE_TEMPLATE_LIMITS, type DiligenceQuestion } from "@/types/diligence";
import { PAGES } from "@/utilities/pages";

const { MAX_QUESTIONS, QUESTION_TEXT_MAX } = DILIGENCE_TEMPLATE_LIMITS;

/**
 * Collision-free stable id for a *newly added* row only. Existing rows keep the
 * server-issued id untouched, so collected answers stay keyed correctly across
 * edits. We never use the array index as the id, and avoid Math.random/Date.now
 * patterns flagged by the anti-pattern rules.
 */
let fallbackIdCounter = 0;
function makeQuestionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  fallbackIdCounter += 1;
  return `dq-${fallbackIdCounter.toString(36)}`;
}

interface RowError {
  message: string;
}

function validateRow(text: string): RowError | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { message: "Add a question or remove this row." };
  }
  if (trimmed.length > QUESTION_TEXT_MAX) {
    return { message: `Use ${QUESTION_TEXT_MAX.toLocaleString()} characters or fewer.` };
  }
  return null;
}

interface QuestionRowProps {
  index: number;
  question: DiligenceQuestion;
  error: RowError | null;
  showError: boolean;
  disabled: boolean;
  onChangeText: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}

/**
 * A single editable, drag-sortable question row. Memoised because it is rendered
 * inside a `.map()` — keyed by the stable question id so React preserves
 * focus/caret across reorders and removals. Reordering only changes the array
 * order; each question keeps its opaque id, so collected answers stay keyed
 * correctly. Only the grip handle is draggable, so the textarea stays editable.
 */
const QuestionRow = React.memo(function QuestionRow({
  index,
  question,
  error,
  showError,
  disabled,
  onChangeText,
  onRemove,
}: QuestionRowProps) {
  const label = `Question ${index + 1}`;
  const length = question.text.trim().length;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    disabled,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2 rounded-xl border bg-card p-4 ${
        isDragging ? "z-10 border-brand/40 shadow-lg" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={`Drag to reorder ${label.toLowerCase()}`}
          className="mt-1.5 shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground/60 transition-colors hover:text-foreground focus:outline-none focus:ring-1 focus:ring-brand/40 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <span className="mt-2 w-5 shrink-0 text-sm font-medium text-muted-foreground" aria-hidden>
          {index + 1}.
        </span>
        <div className="flex-1">
          <Textarea
            aria-label={label}
            value={question.text}
            disabled={disabled}
            maxLength={QUESTION_TEXT_MAX + 100}
            placeholder="e.g. How do you measure the impact of this program?"
            onChange={(event) => onChangeText(question.id, event.target.value)}
          />
          <div className="mt-1 flex items-center justify-between gap-3">
            {showError && error ? (
              <p className="text-xs text-destructive">{error.message}</p>
            ) : (
              <span />
            )}
            <span
              className={
                length > QUESTION_TEXT_MAX
                  ? "text-xs text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {length.toLocaleString()}/{QUESTION_TEXT_MAX.toLocaleString()}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${label.toLowerCase()}`}
          disabled={disabled}
          onClick={() => onRemove(question.id)}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </li>
  );
});

/**
 * Advisor diligence-question template editor (DEV-428).
 *
 * Manages the advisor's single reusable question template via GET/PUT. Renders
 * the three load states required by the gap-app-v2 three-state rule:
 *   - loading: shared skeleton
 *   - error: retry CTA (never `return null`)
 *   - success: the editable list — note an EMPTY template (`questions: []`) is a
 *     normal editable state with an "Add your first question" CTA, not an error.
 *
 * Saving with an empty list clears the template, so that path is gated behind a
 * confirmation dialog. The save mutation seeds the cache, keeping this editor in
 * sync with the server's canonical copy.
 */
export function DiligenceTemplateEditor() {
  const templateQuery = useDiligenceTemplate();
  const save = useSaveDiligenceTemplate();

  const [rows, setRows] = useState<DiligenceQuestion[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // Seed local rows from the server whenever a *new* server copy lands (first
  // load, or after a save bumps `updatedAt`). Background refetches returning the
  // same `updatedAt` won't clobber in-progress edits.
  const lastSyncedRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const data = templateQuery.data;
    if (!data) return;
    if (lastSyncedRef.current !== data.updatedAt) {
      lastSyncedRef.current = data.updatedAt;
      setRows(data.questions.map((question) => ({ id: question.id, text: question.text })));
      setSubmitAttempted(false);
    }
  }, [templateQuery.data]);

  const handleChangeText = useCallback((id: string, text: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, text } : row)));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const handleAdd = useCallback(() => {
    setRows((prev) =>
      prev.length >= MAX_QUESTIONS ? prev : [...prev, { id: makeQuestionId(), text: "" }]
    );
  }, []);

  const performSave = useCallback(
    (questions: DiligenceQuestion[]) => {
      save.mutate(
        { questions },
        {
          onSuccess: () => toast.success("Diligence questions saved."),
          onError: () => toast.error("Couldn't save your diligence questions. Please try again."),
        }
      );
    },
    [save]
  );

  // Drag-to-reorder. PointerSensor's 8px activation distance lets the textarea
  // and grip clicks through without starting a drag; KeyboardSensor makes the
  // grip handle reorderable with the arrow keys. Reorder only reshuffles the
  // array — ids are untouched, so answers stay keyed to the right question.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const oldIndex = prev.findIndex((row) => row.id === active.id);
      const newIndex = prev.findIndex((row) => row.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  // -- Load states -----------------------------------------------------------

  if (templateQuery.isLoading) {
    return <DonorResearchLoading label="Loading your diligence questions…" />;
  }

  if (templateQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Couldn&apos;t load your questions
          </h1>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load your diligence questions. Please try again.
          </p>
          <Button type="button" variant="outline" onClick={() => templateQuery.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // -- Editable (success) state ---------------------------------------------

  const rowErrors = rows.map((row) => validateRow(row.text));
  const hasBlockingError = rowErrors.some(Boolean);

  const isEmpty = rows.length === 0;
  const atCap = rows.length >= MAX_QUESTIONS;
  const remaining = MAX_QUESTIONS - rows.length;
  const serverHasQuestions = (templateQuery.data?.questions.length ?? 0) > 0;
  const updatedAt = templateQuery.data?.updatedAt ?? null;

  // Empty + nothing on the server to clear → Save is a no-op; otherwise allow it
  // (an empty save clears the template, gated by the confirmation dialog).
  const saveDisabled = save.isPending || hasBlockingError || (isEmpty && !serverHasQuestions);

  const handleSaveClick = () => {
    setSubmitAttempted(true);
    if (hasBlockingError) return;
    if (isEmpty) {
      setClearConfirmOpen(true);
      return;
    }
    performSave(rows.map((row) => ({ id: row.id, text: row.text.trim() })));
  };

  const handleConfirmClear = () => {
    setClearConfirmOpen(false);
    performSave([]);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link
        href={PAGES.DONOR_RESEARCH.INDEX}
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to research dashboard
      </Link>
      <header className="mb-8 border-b border-border/60 pb-6">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Karma · Nonprofit Research
        </p>
        <h1 className="text-balance text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          Diligence questions
        </h1>
        <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
          These questions are sent anonymously to nonprofits when you request diligence. Each
          request keeps its own snapshot, so editing here only affects future requests.
        </p>
        {updatedAt ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Last saved {new Date(updatedAt).toLocaleString()}
          </p>
        ) : null}
      </header>

      {isEmpty ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <h2 className="text-base font-medium text-foreground">No questions yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add the questions you want every nonprofit to answer before you decide to connect.
          </p>
          <Button type="button" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            Add your first question
          </Button>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rows.map((row) => row.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col gap-3">
                {rows.map((row, index) => (
                  <QuestionRow
                    key={row.id}
                    index={index}
                    question={row}
                    error={rowErrors[index]}
                    showError={submitAttempted || row.text.trim().length > QUESTION_TEXT_MAX}
                    disabled={save.isPending}
                    onChangeText={handleChangeText}
                    onRemove={handleRemove}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleAdd}
              disabled={atCap || save.isPending}
            >
              <Plus className="h-4 w-4" />
              Add question
            </Button>
            <p className="text-xs text-muted-foreground">
              {atCap
                ? `You've reached the ${MAX_QUESTIONS}-question limit.`
                : `${remaining} ${pluralize("question", remaining)} remaining.`}
            </p>
          </div>
        </>
      )}

      <div className="mt-8 flex items-center justify-end gap-3 border-t border-border/60 pt-6">
        <Button type="button" onClick={handleSaveClick} disabled={saveDisabled}>
          {save.isPending ? "Saving…" : "Save questions"}
        </Button>
      </div>

      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear your diligence questions?</DialogTitle>
            <DialogDescription>
              This will clear your diligence questions. Requests you&apos;ve already sent keep their
              own snapshot, but new requests will have no questions until you add some again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setClearConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmClear}
              disabled={save.isPending}
            >
              {save.isPending ? "Clearing…" : "Clear questions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
