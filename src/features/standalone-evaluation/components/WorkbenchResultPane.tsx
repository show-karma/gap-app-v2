"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { cn } from "@/utilities/tailwind";
import type { EvaluationResultResponse, EvaluationStyle } from "../schemas/session.schema";

const MarkdownPreview = dynamic(
  () =>
    import("@/components/Utilities/MarkdownPreview").then((m) => ({
      default: m.MarkdownPreview,
    })),
  { ssr: false }
);

interface WorkbenchResultPaneProps {
  results: ReadonlyArray<EvaluationResultResponse>;
  style: EvaluationStyle;
  activeIterationNumber: number;
  onSelectIteration: (iterationNumber: number) => void;
}

interface RubricEvaluation {
  criteria?: Array<{ name: string; score: number; rationale?: string }>;
  strengths?: string[];
  weaknesses?: string[];
  recommendation?: string;
  overallScore?: number;
}

interface NarrativeEvaluation {
  narrative?: string;
  overallAssessment?: string;
  sections?: Array<{ title: string; body: string }>;
  scores?: Record<string, number>;
  summary?: string;
}

interface QuickScoreEvaluation {
  decision?: string;
  verdict?: string;
  keyFactors?: string[];
  redFlags?: string[];
  oneLineSummary?: string;
  summary?: string;
}

export function WorkbenchResultPane({
  results,
  style,
  activeIterationNumber,
  onSelectIteration,
}: WorkbenchResultPaneProps) {
  const sorted = useMemo(
    () => [...results].sort((a, b) => a.iterationNumber - b.iterationNumber),
    [results]
  );

  if (sorted.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-medium text-foreground">No evaluations yet</p>
        <p className="text-xs text-muted-foreground">
          Run an evaluation on the sample to see scores, criteria, and feedback here.
        </p>
      </div>
    );
  }

  const active =
    sorted.find((r) => r.iterationNumber === activeIterationNumber) ?? sorted[sorted.length - 1];
  const previousIndex = sorted.findIndex((r) => r.id === active.id) - 1;
  const previous = previousIndex >= 0 ? sorted[previousIndex] : null;
  const delta =
    active.score !== null && previous?.score !== null && previous?.score !== undefined
      ? Math.round(active.score - previous.score)
      : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Result
        </span>
        <IterationSwitcher
          iterations={sorted.map((r) => r.iterationNumber)}
          active={active.iterationNumber}
          onChange={onSelectIteration}
        />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
        <ScoreCard result={active} delta={delta} />
        {style === "RUBRIC" ? (
          <RubricBlocks data={active.fullEvaluation as RubricEvaluation} />
        ) : style === "NARRATIVE" ? (
          <NarrativeBlocks
            data={active.fullEvaluation as NarrativeEvaluation}
            fallbackSummary={active.summary}
          />
        ) : (
          <QuickScoreBlocks data={active.fullEvaluation as QuickScoreEvaluation} />
        )}
      </div>
    </div>
  );
}

interface IterationSwitcherProps {
  iterations: number[];
  active: number;
  onChange: (n: number) => void;
}

function IterationSwitcher({ iterations, active, onChange }: IterationSwitcherProps) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border">
      {iterations.map((n, i) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "px-2.5 py-0.5 text-xs font-medium tabular-nums transition-colors",
            active === n
              ? "bg-foreground text-background"
              : "bg-background text-muted-foreground hover:text-foreground",
            i > 0 && "border-l border-border"
          )}
          aria-label={`Show iteration ${n + 1}`}
        >
          v{n + 1}
        </button>
      ))}
    </div>
  );
}

interface ScoreCardProps {
  result: EvaluationResultResponse;
  delta: number | null;
}

function ScoreCard({ result, delta }: ScoreCardProps) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-3">
        <ScorePill score={result.score} big />
        <div className="flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Iteration {result.iterationNumber + 1} · {result.model}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {delta === null
              ? "First iteration"
              : delta === 0
                ? "No change from previous"
                : `Δ ${delta > 0 ? "+" : ""}${delta} from previous`}
          </div>
        </div>
      </div>
      {result.summary ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground">{result.summary}</p>
      ) : null}
    </div>
  );
}

function RubricBlocks({ data }: { data: RubricEvaluation }) {
  const criteria = data?.criteria ?? [];
  const strengths = data?.strengths ?? [];
  const weaknesses = data?.weaknesses ?? [];
  return (
    <>
      {criteria.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Criteria
          </div>
          <ul className="divide-y divide-border">
            {criteria.map((c) => (
              <li
                key={c.name}
                className="grid grid-cols-[2.5rem_1fr] items-center gap-3 px-4 py-2.5"
              >
                <CriterionBadge score={c.score} />
                <div>
                  <div className="text-sm font-medium text-foreground">{c.name}</div>
                  {c.rationale ? (
                    <div className="text-xs leading-snug text-muted-foreground">{c.rationale}</div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {strengths.length > 0 || weaknesses.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {strengths.length > 0 ? (
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                Strengths
              </div>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-foreground">
                {strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {weaknesses.length > 0 ? (
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-300">
                Weaknesses
              </div>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-foreground">
                {weaknesses.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {data?.recommendation ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-500/10">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Recommendation
          </div>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{data.recommendation}</p>
        </div>
      ) : null}
    </>
  );
}

function NarrativeBlocks({
  data,
  fallbackSummary,
}: {
  data: NarrativeEvaluation;
  fallbackSummary: string | null;
}) {
  const text = data?.narrative ?? fallbackSummary ?? "";
  const sections = data?.sections ?? [];
  return (
    <>
      {data?.overallAssessment ? (
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Overall assessment
          </div>
          <div className="mt-1 text-sm font-semibold capitalize text-foreground">
            {data.overallAssessment}
          </div>
        </div>
      ) : null}
      {text ? (
        <div className="rounded-xl border border-border bg-background p-4 text-sm leading-relaxed">
          <MarkdownPreview source={text} />
        </div>
      ) : null}
      {sections.length > 0 ? (
        <div className="space-y-2">
          {sections.map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-background p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {s.title}
              </div>
              <div className="mt-1 text-sm leading-relaxed text-foreground">
                <MarkdownPreview source={s.body} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function QuickScoreBlocks({ data }: { data: QuickScoreEvaluation }) {
  const verdict = data?.verdict ?? data?.decision ?? "";
  const summary = data?.oneLineSummary ?? data?.summary ?? "";
  return (
    <>
      {verdict ? (
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Verdict
          </div>
          <div className="mt-1 text-sm font-semibold capitalize text-foreground">{verdict}</div>
        </div>
      ) : null}
      {summary ? (
        <div className="rounded-xl border border-border bg-background p-3 text-sm text-foreground">
          {summary}
        </div>
      ) : null}
      {data?.keyFactors && data.keyFactors.length > 0 ? (
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
            Key factors
          </div>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-foreground">
            {data.keyFactors.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data?.redFlags && data.redFlags.length > 0 ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/30">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-yellow-700 dark:text-yellow-300">
            Red flags
          </div>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-foreground">
            {data.redFlags.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

function CriterionBadge({ score }: { score: number }) {
  const cls =
    score >= 7
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      : score >= 5
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  return (
    <span
      className={cn(
        "inline-flex h-6 w-10 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
        cls
      )}
    >
      {score}
    </span>
  );
}

function ScorePill({ score, big = false }: { score: number | null; big?: boolean }) {
  if (score === null) return null;
  const cls =
    score >= 70
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      : score >= 50
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-0.5 font-bold tabular-nums",
        big ? "rounded-xl px-3 py-1.5 text-lg" : "rounded-full px-2 py-0.5 text-xs",
        cls
      )}
    >
      {Math.round(score)}
      <span className={cn("font-medium opacity-70", big ? "text-xs" : "text-[10px]")}>/100</span>
    </span>
  );
}
