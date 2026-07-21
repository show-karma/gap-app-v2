"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import pluralize from "pluralize";
import { memo, useRef } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitDiligenceResponse } from "@/hooks/useDiligence";
import type { DiligenceSubmitError } from "@/services/diligence.service";
import {
  DILIGENCE_RESPONSE_LIMITS,
  type DiligenceAnswerInput,
  type DiligenceQuestion,
} from "@/types/diligence";

interface DiligenceResponseFormProps {
  token: string;
  questions: DiligenceQuestion[];
}

const { ANSWER_TEXT_MAX } = DILIGENCE_RESPONSE_LIMITS;

// Per-field is optional, but the backend requires 1–50 answers, so we require
// at least one non-empty answer across the form and cap each at the wire limit.
const formSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        text: z.string().max(ANSWER_TEXT_MAX, {
          message: `Answers must be ${ANSWER_TEXT_MAX} characters or fewer.`,
        }),
      })
    )
    .refine((answers) => answers.some((answer) => answer.text.trim().length > 0), {
      message: "Please answer at least one question before submitting.",
    }),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * Maps a DiligenceSubmitError status to a nonprofit-safe message. 429 keeps the
 * form intact (no auto-retry) so the responder can resubmit after a beat.
 */
function messageForStatus(status: number): string {
  if (status === 429) return "Please wait a moment and try again.";
  if (status === 404 || status === 410) return "This link is no longer valid.";
  if (status === 422) return "Some answers couldn't be accepted. Please review and try again.";
  if (status === 403) return "We couldn't submit your answers. Please try again later.";
  return "Something went wrong submitting your answers. Please try again.";
}

export function DiligenceResponseForm({ token, questions }: DiligenceResponseFormProps) {
  const submitResponse = useSubmitDiligenceResponse(token);
  // Synchronous re-entrancy guard. The submit button's `disabled` state only
  // updates on the next render, so a same-tick double-click (or fast double
  // submit) would otherwise fire two POSTs before `isPending` flips. The ref is
  // set before the mutation and cleared in `onSettled`.
  const submittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      answers: questions.map((question) => ({ questionId: question.id, text: "" })),
    },
  });

  const onSubmit = handleSubmit((values) => {
    // Trim + drop blanks in a single pass (only non-empty answers are sent).
    const answers = values.answers.reduce<DiligenceAnswerInput[]>((acc, answer) => {
      const text = answer.text.trim();
      if (text.length > 0) acc.push({ questionId: answer.questionId, text });
      return acc;
    }, []);

    if (answers.length === 0) {
      toast.error("Please answer at least one question before submitting.");
      return;
    }

    // Drop the second of a rapid double-submit before a duplicate POST goes out.
    if (submittingRef.current || submitResponse.isPending) {
      return;
    }
    submittingRef.current = true;

    submitResponse.mutate(
      { answers },
      {
        // The hook flips `alreadySubmitted` in the cache on success; the parent
        // re-renders into the thank-you state. `accepted: false` is still a
        // success (another response was recorded first).
        onSuccess: () => {
          toast.success("Thanks — your answers were received.");
        },
        onError: (error) => {
          const status = (error as DiligenceSubmitError).status;
          toast.error(messageForStatus(status ?? 500));
        },
        onSettled: () => {
          submittingRef.current = false;
        },
      }
    );
  });

  const isPending = submitResponse.isPending;
  // RHF places an array-level zod refine error at `.root` (newer) or `.message`.
  const atLeastOneError = errors.answers?.root?.message ?? errors.answers?.message;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <ul className="flex flex-col gap-5">
        {questions.map((question, index) => (
          <QuestionField
            key={question.id}
            question={question}
            registration={register(`answers.${index}.text` as const)}
          />
        ))}
      </ul>

      {atLeastOneError ? (
        <p className="text-sm text-destructive" role="alert">
          {atLeastOneError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending ? (
            <>
              <Spinner className="size-4" />
              Submitting…
            </>
          ) : (
            `Submit ${pluralize("answer", questions.length)}`
          )}
        </Button>
      </div>
    </form>
  );
}

interface QuestionFieldProps {
  question: DiligenceQuestion;
  registration: UseFormRegisterReturn;
}

/**
 * One question + answer textarea. Memoized because it's rendered in a `.map()`
 * and react-hook-form's `register` keeps these uncontrolled, so the rows don't
 * need to re-render on every keystroke.
 */
const QuestionField = memo(function QuestionField({ question, registration }: QuestionFieldProps) {
  return (
    <li className="flex flex-col gap-2">
      <Label htmlFor={registration.name} className="text-foreground">
        {question.text}
      </Label>
      <Textarea
        id={registration.name}
        maxLength={ANSWER_TEXT_MAX}
        placeholder="Type your answer (optional)"
        className="min-h-[96px]"
        {...registration}
      />
    </li>
  );
});
