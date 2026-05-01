"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useCreateSession } from "../hooks/useEvaluationSessions";
import {
  PROGRAM_DESCRIPTION_MAX,
  type SessionCreateInput,
  sessionCreateSchema,
} from "../schemas/session.schema";
import { useEvaluationDraftStore } from "../store/evaluationDraftStore";
import { StylePicker } from "./StylePicker";
import { TemplatePicker } from "./TemplatePicker";

interface EvaluationSessionFormProps {
  onCancel?: () => void;
}

const textareaClass =
  "mt-1 w-full min-h-[140px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60";

export function EvaluationSessionForm({ onCancel }: EvaluationSessionFormProps) {
  const draft = useEvaluationDraftStore((s) => s.draft);
  const setDraft = useEvaluationDraftStore((s) => s.setDraft);

  const createSession = useCreateSession();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<SessionCreateInput>({
    resolver: zodResolver(sessionCreateSchema),
    mode: "onChange",
    defaultValues: {
      programDescription: draft.programDescription,
      evaluationCriteria: draft.evaluationCriteria,
      evaluationStyle: draft.evaluationStyle,
    },
  });

  // Persist form values back into the draft store when they change so
  // refreshing/abandoning the page doesn't lose progress.
  const programDescription = watch("programDescription");
  const evaluationCriteria = watch("evaluationCriteria");
  const evaluationStyle = watch("evaluationStyle");

  useEffect(() => {
    setDraft({ programDescription, evaluationCriteria, evaluationStyle });
  }, [programDescription, evaluationCriteria, evaluationStyle, setDraft]);

  const isSubmitting = createSession.isPending;

  const onSubmit = (input: SessionCreateInput) => {
    createSession.mutate(input);
  };

  return (
    <div className="space-y-6">
      <TemplatePicker
        onSelect={(tpl) => {
          reset({
            programDescription: tpl.programDescription,
            evaluationCriteria: tpl.evaluationCriteria,
            evaluationStyle: tpl.evaluationStyle,
          });
        }}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 rounded-xl border border-border bg-card p-6"
        aria-label="Create evaluation session"
      >
        <div>
          <label htmlFor="program-description" className="text-sm font-medium text-foreground">
            Program description
          </label>
          <p className="text-xs text-muted-foreground">
            Tell the model what your funding program is about, who it serves, and what kinds of
            applications you receive.
          </p>
          <textarea
            id="program-description"
            disabled={isSubmitting}
            placeholder="e.g. Public goods funding for open-source infrastructure on Optimism..."
            className={textareaClass}
            {...register("programDescription")}
          />
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-red-500">{errors.programDescription?.message}</span>
            <span className="text-muted-foreground">
              {(watch("programDescription") ?? "").length}/{PROGRAM_DESCRIPTION_MAX}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="evaluation-criteria" className="text-sm font-medium text-foreground">
            Evaluation criteria
          </label>
          <p className="text-xs text-muted-foreground">
            Spell out the dimensions you want graded. Bullet lists work well.
          </p>
          <textarea
            id="evaluation-criteria"
            disabled={isSubmitting}
            placeholder={
              "- Technical feasibility\n- Team experience\n- Public goods alignment\n- Budget reasonableness"
            }
            className={textareaClass}
            {...register("evaluationCriteria")}
          />
          <p className="mt-1 text-xs text-red-500">{errors.evaluationCriteria?.message}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-foreground">Evaluation style</span>
          <div className="mt-2">
            <StylePicker
              value={evaluationStyle}
              onChange={(style) => setValue("evaluationStyle", style, { shouldValidate: true })}
              disabled={isSubmitting}
              errorMessage={errors.evaluationStyle?.message}
            />
          </div>
        </div>

        {createSession.isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <p className="font-medium">Could not create session</p>
            <p>{createSession.error.message}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating
              </>
            ) : (
              "Create session"
            )}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
