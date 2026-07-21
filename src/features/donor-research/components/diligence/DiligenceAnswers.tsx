import pluralize from "pluralize";
import { memo } from "react";
import type { CandidateDiligenceAnswers, CandidateDiligenceRequest } from "@/types/diligence";
import { relativeDays } from "../report-brief/text-utils";

interface DiligenceAnswersProps {
  /** Frozen snapshot taken when the request was sent — render against this. */
  request: CandidateDiligenceRequest;
  /** Latest accepted answers, keyed by snapshot question id. */
  answers: CandidateDiligenceAnswers;
}

/**
 * Renders the nonprofit's latest answers against the FROZEN request snapshot
 * (`request.questions`) — never the live template, which can diverge after the
 * advisor edits it. Missing keys render an explicit "No answer provided".
 */
export function DiligenceAnswers({ request, answers }: DiligenceAnswersProps) {
  const receivedLabel = relativeTimeLabel(answers.receivedAt);
  const answeredCount = request.questions.filter((question) =>
    Boolean(answers.answers[question.id]?.trim())
  ).length;

  return (
    <section className="rounded-md border border-border/60 bg-muted/20 p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Nonprofit's response
        </p>
        {answeredCount > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {answeredCount} {pluralize("answer", answeredCount)}
            {receivedLabel ? ` · received ${receivedLabel}` : null}
          </p>
        ) : null}
      </header>

      <dl className="flex flex-col gap-3">
        {request.questions.map((question) => (
          <AnswerRow
            key={question.id}
            questionText={question.text}
            answerText={answers.answers[question.id] ?? null}
          />
        ))}
      </dl>
    </section>
  );
}

interface AnswerRowProps {
  questionText: string;
  answerText: string | null;
}

const AnswerRow = memo(function AnswerRow({ questionText, answerText }: AnswerRowProps) {
  const hasAnswer = Boolean(answerText?.trim());
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm font-medium text-foreground">{questionText}</dt>
      <dd
        className={
          hasAnswer
            ? "whitespace-pre-line text-sm leading-relaxed text-foreground/85"
            : "text-sm italic text-muted-foreground"
        }
      >
        {hasAnswer ? answerText : "No answer provided"}
      </dd>
    </div>
  );
});

function relativeTimeLabel(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return null;
  }
  return relativeDays(ms);
}
