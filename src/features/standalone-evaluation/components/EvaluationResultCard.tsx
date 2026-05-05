"use client";

import dynamic from "next/dynamic";
import React from "react";
import { cn } from "@/utilities/tailwind";
import type { EvaluationResultResponse, EvaluationStyle } from "../schemas/session.schema";

const MarkdownPreview = dynamic(
  () =>
    import("@/components/Utilities/MarkdownPreview").then((m) => ({
      default: m.MarkdownPreview,
    })),
  { ssr: false }
);

interface EvaluationResultCardProps {
  result: EvaluationResultResponse;
  style: EvaluationStyle;
  highlight?: boolean;
}

interface RubricEvaluation {
  criteria?: Array<{
    name: string;
    score: number;
    rationale?: string;
  }>;
  strengths?: string[];
  weaknesses?: string[];
  recommendation?: string;
  overallScore?: number;
}

interface NarrativeEvaluation {
  // BE prompt currently asks for `narrative` (a single multi-paragraph string)
  // + `overallAssessment` (strong/moderate/weak) + `summary`. Older prompts
  // may emit `sections[]`/`scores` — both shapes render correctly.
  narrative?: string;
  overallAssessment?: string;
  sections?: Array<{ title: string; body: string }>;
  scores?: Record<string, number>;
  summary?: string;
}

interface QuickScoreEvaluation {
  // Accept both `decision` (legacy/expected) and `verdict` (what the BE
  // prompt currently asks the LLM to emit). One of them gets normalized
  // and rendered.
  decision?: "PASS" | "FAIL" | string;
  verdict?: "approve" | "reject" | "needs-review" | string;
  keyFactors?: string[];
  redFlags?: string[];
  oneLineSummary?: string;
  summary?: string;
}

function ScoreBadge({ score, max = 100 }: { score: number | null; max?: number }) {
  if (score === null) return null;
  // Bands are computed as a percentage of `max` so the same badge works for
  // both the 0-100 overall score and the 0-10 per-criterion score.
  const ratio = score / max;
  const color =
    ratio >= 0.8
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      : ratio >= 0.5
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  return (
    <output
      aria-label={`Score ${score} out of ${max}`}
      className={cn("rounded-full px-3 py-1 text-sm font-semibold", color)}
    >
      {score}/{max}
    </output>
  );
}

function RubricBlock({ data }: { data: RubricEvaluation }) {
  return (
    <div className="space-y-4">
      {(data.criteria?.length ?? 0) > 0 ? (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Criterion</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {data.criteria!.map((c) => (
                <tr key={c.name} className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-foreground">{c.name}</td>
                  <td className="px-3 py-2">
                    {/* Per-criterion scores are 0-10 per the BE prompt schema. */}
                    <ScoreBadge score={c.score} max={10} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{c.rationale ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.strengths?.length ? (
          <div className="rounded-md border border-border p-3">
            <h4 className="mb-1 text-sm font-semibold text-foreground">Strengths</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {data.strengths.map((s, i) => (
                <li key={`${i}-${s.slice(0, 8)}`}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {data.weaknesses?.length ? (
          <div className="rounded-md border border-border p-3">
            <h4 className="mb-1 text-sm font-semibold text-foreground">Weaknesses</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {data.weaknesses.map((s, i) => (
                <li key={`${i}-${s.slice(0, 8)}`}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {data.recommendation ? (
        <div className="rounded-md border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-900 dark:bg-brand-500/10">
          <h4 className="mb-1 text-sm font-semibold text-foreground">Recommendation</h4>
          <p className="text-muted-foreground">{data.recommendation}</p>
        </div>
      ) : null}
    </div>
  );
}

function NarrativeBlock({
  data,
  fallbackSummary,
}: {
  data: NarrativeEvaluation;
  fallbackSummary: string | null;
}) {
  return (
    <div className="space-y-4">
      {data.scores && Object.keys(data.scores).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.scores).map(([name, value]) => (
            <span
              key={name}
              className="rounded-md border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
            >
              <span className="mr-1 font-semibold text-foreground">{name}:</span>
              {value}
            </span>
          ))}
        </div>
      ) : null}
      {data.overallAssessment ? (
        <span className="inline-flex rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
          {data.overallAssessment}
        </span>
      ) : null}
      {data.sections?.length ? (
        <div className="space-y-3">
          {data.sections.map((sec, i) => (
            <div key={`${i}-${sec.title}`} className="rounded-md border border-border p-3">
              <h4 className="mb-1 text-sm font-semibold text-foreground">{sec.title}</h4>
              <div className="text-sm text-muted-foreground">
                <MarkdownPreview source={sec.body} />
              </div>
            </div>
          ))}
        </div>
      ) : data.narrative ? (
        // BE-prompt shape: a single multi-paragraph narrative string.
        <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
          <MarkdownPreview source={data.narrative} />
        </div>
      ) : (data.summary ?? fallbackSummary) ? (
        <div className="text-sm text-muted-foreground">
          <MarkdownPreview source={(data.summary ?? fallbackSummary) as string} />
        </div>
      ) : null}
    </div>
  );
}

function QuickScoreBlock({ data }: { data: QuickScoreEvaluation }) {
  // BE prompt asks for `verdict` ("approve" | "reject" | "needs-review");
  // accept `decision` too in case future prompts use that name. Normalize to
  // uppercase so PASS/APPROVE both color green, FAIL/REJECT red.
  const verdict = (data.decision ?? data.verdict ?? "").toUpperCase();
  const isPositive = verdict === "PASS" || verdict === "APPROVE";
  const isNegative = verdict === "FAIL" || verdict === "REJECT";
  const verdictClass = isPositive
    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
    : isNegative
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : "bg-muted text-foreground";
  const oneLine = data.oneLineSummary ?? data.summary;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {verdict ? (
          <span
            className={cn("rounded-full px-3 py-1 text-sm font-semibold uppercase", verdictClass)}
          >
            {verdict}
          </span>
        ) : null}
        {oneLine ? <p className="text-sm text-muted-foreground">{oneLine}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.keyFactors?.length ? (
          <div className="rounded-md border border-border p-3">
            <h4 className="mb-1 text-sm font-semibold text-foreground">Key factors</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {data.keyFactors.map((s, i) => (
                <li key={`${i}-${s.slice(0, 8)}`}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {data.redFlags?.length ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
            <h4 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-300">Red flags</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-red-700 dark:text-red-300">
              {data.redFlags.map((s, i) => (
                <li key={`${i}-${s.slice(0, 8)}`}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const EvaluationResultCard = React.memo(function EvaluationResultCard({
  result,
  style,
  highlight,
}: EvaluationResultCardProps) {
  const fullEvaluation = result.fullEvaluation as Record<string, unknown>;
  return (
    <article
      data-testid={`eval-result-${style.toLowerCase()}`}
      className={cn(
        "space-y-3 rounded-xl border bg-card p-5",
        highlight ? "border-brand-500 shadow-sm" : "border-border"
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
            Iteration {result.iterationNumber + 1}
          </span>
          <ScoreBadge score={result.score} />
        </div>
        <span className="text-xs text-muted-foreground">{result.model}</span>
      </header>

      {/* NarrativeBlock falls back to result.summary; skip here to avoid duplication. */}
      {style !== "NARRATIVE" && result.summary ? (
        <p className="text-sm text-foreground">{result.summary}</p>
      ) : null}

      {style === "RUBRIC" ? (
        <RubricBlock data={fullEvaluation as RubricEvaluation} />
      ) : style === "NARRATIVE" ? (
        <NarrativeBlock
          data={fullEvaluation as NarrativeEvaluation}
          fallbackSummary={result.summary}
        />
      ) : (
        <QuickScoreBlock data={fullEvaluation as QuickScoreEvaluation} />
      )}
    </article>
  );
});
