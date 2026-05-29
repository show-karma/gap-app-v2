"use client";

import * as Sentry from "@sentry/nextjs";
import { Info, Loader2, Sparkles } from "lucide-react";
import type React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utilities/tailwind";
import {
  DecisionDisplay,
  DisqualificationReason,
  EvaluationSummary,
  ImprovementRecommendations,
  ScoreDisplay,
  StatusChip,
} from "./AIEvaluationDisplay.parts";

function logAIEvaluationDataIssue(errorId: string, extra: Record<string, unknown>) {
  Sentry.captureMessage(`AIEvaluationDisplay: ${errorId}`, {
    level: "warning",
    tags: { component: "AIEvaluationDisplay", errorId },
    extra,
  });
}

export type AIEvaluationData = string | Record<string, unknown>;

type GenericJSON = Record<string, unknown>;

interface AIEvaluationDisplayProps {
  evaluation: AIEvaluationData | null;
  isLoading: boolean;
  isEnabled: boolean;
  className?: string;
  hasError?: boolean;
  programName?: string;
}

function parseEvaluation(evaluationStr: AIEvaluationData): GenericJSON | null {
  try {
    if (typeof evaluationStr === "object" && evaluationStr !== null) {
      return evaluationStr as GenericJSON;
    }
    return JSON.parse(evaluationStr);
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        component: "AIEvaluationDisplay",
        errorId: "ai-evaluation-parse-failed",
      },
      extra: {
        sample:
          typeof evaluationStr === "string" ? evaluationStr.slice(0, 200) : typeof evaluationStr,
      },
    });
    return null;
  }
}

function RenderedValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">null</span>;
  }
  if (typeof value === "string") {
    if (value.includes("\n")) {
      return (
        <div className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap text-sm leading-relaxed">
          {value}
        </div>
      );
    }
    return <span className="text-zinc-700 dark:text-zinc-300">{value}</span>;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <span className="text-primary">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">[]</span>;
    return (
      <div className={depth > 0 ? "ml-4" : ""}>
        {value.map((item, index) => {
          const primitiveSuffix =
            typeof item === "string" || typeof item === "number" || typeof item === "boolean"
              ? String(item)
              : "obj";
          return (
            <div
              key={`${depth}-${index}-${primitiveSuffix}`}
              className="flex items-start gap-2 my-1"
            >
              <span className="text-muted-foreground select-none">&bull;</span>
              <RenderedValue value={item} depth={depth + 1} />
            </div>
          );
        })}
      </div>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-muted-foreground">{"{}"}</span>;
    return (
      <div className={depth > 0 ? "ml-4" : ""}>
        {entries.map(([key, val]) => (
          <div key={key} className="my-2">
            <span className="font-medium text-zinc-600 dark:text-zinc-400 capitalize">
              {key.replace(/_/g, " ")}:
            </span>{" "}
            <RenderedValue value={val} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-muted-foreground">{String(value)}</span>;
}

function EvaluationDisplay({ data, programName }: { data: GenericJSON; programName?: string }) {
  const lowerName = programName?.toLowerCase() ?? "";
  const isAuditGrants = lowerName.includes("audit grants");
  const isGrowthGrants = lowerName.includes("growth grants");

  const evalData = data;
  const rawScore = evalData.final_score ?? evalData.score;
  // Trim string scores before coercion — `Number("")` and `Number("   ")` both
  // return 0, which would otherwise pass the 0–10 range check and render as a
  // legitimate "Score: 0/10". Treat blank/whitespace as malformed.
  const trimmedRawScore = typeof rawScore === "string" ? rawScore.trim() : rawScore;
  const isBlankStringScore = typeof rawScore === "string" && trimmedRawScore === "";
  const parsedScore =
    trimmedRawScore == null || isBlankStringScore ? null : Number(trimmedRawScore);
  const hasValidScore =
    parsedScore !== null && Number.isFinite(parsedScore) && parsedScore >= 0 && parsedScore <= 10;
  const hasMalformedScore = isBlankStringScore || (parsedScore !== null && !hasValidScore);
  if (hasMalformedScore) {
    logAIEvaluationDataIssue("ai-evaluation-malformed-score", {
      rawScoreType: typeof rawScore,
      rawScoreSample: String(rawScore).slice(0, 50),
      programName,
    });
  }

  const rawRecommendations = evalData.improvement_recommendations;
  const hasRecommendations = rawRecommendations !== undefined;
  const improvementRecommendations = Array.isArray(rawRecommendations)
    ? (rawRecommendations as Array<{
        priority?: string;
        recommendation?: string;
        impact?: string;
      }>)
    : [];
  if (hasRecommendations && !Array.isArray(rawRecommendations)) {
    let rawRecommendationsSample: string;
    try {
      rawRecommendationsSample = JSON.stringify(rawRecommendations).slice(0, 200);
    } catch {
      rawRecommendationsSample = String(rawRecommendations).slice(0, 200);
    }
    logAIEvaluationDataIssue("ai-evaluation-malformed-recommendations", {
      rawRecommendationsType: typeof rawRecommendations,
      rawRecommendationsSample,
      programName,
    });
  }
  for (const field of ["feedback", "applicant_guidance"] as const) {
    const value = evalData[field];
    if (value !== undefined && value !== null && typeof value !== "string") {
      logAIEvaluationDataIssue("ai-evaluation-malformed-field", {
        field,
        valueType: typeof value,
        programName,
      });
    }
  }

  const showStatusChip = !isGrowthGrants && Boolean(evalData.evaluation_status);
  const hasImprovementRecommendations = improvementRecommendations.length > 0;
  const renderedFields = new Set<string>(["title"]);
  if (hasMalformedScore || hasValidScore) {
    renderedFields.add("final_score");
    renderedFields.add("score");
  }
  if (showStatusChip) renderedFields.add("evaluation_status");
  if (evalData.decision) renderedFields.add("decision");
  if (evalData.disqualification_reason) renderedFields.add("disqualification_reason");
  if (evalData.evaluation_summary) renderedFields.add("evaluation_summary");
  if (hasImprovementRecommendations) renderedFields.add("improvement_recommendations");
  if (evalData.additional_notes) renderedFields.add("additional_notes");
  if (evalData.reviewer_confidence) renderedFields.add("reviewer_confidence");
  if (evalData.feedback) renderedFields.add("feedback");
  if (evalData.applicant_guidance) renderedFields.add("applicant_guidance");

  return (
    <div className="space-y-4">
      {hasMalformedScore && (
        <div
          className="rounded-md border border-muted-foreground/20 bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
          data-testid="ai-evaluation-score-unavailable"
        >
          Score unavailable. AI returned an unexpected value.
        </div>
      )}
      {hasValidScore && <ScoreDisplay score={parsedScore} isGrowthGrants={isGrowthGrants} />}
      {showStatusChip && (
        <div className="mt-2">
          <StatusChip status={String(evalData.evaluation_status)} />
        </div>
      )}

      {Boolean(evalData.decision) && (
        <DecisionDisplay decision={String(evalData.decision)} isAuditGrants={isAuditGrants} />
      )}

      {Boolean(evalData.disqualification_reason) && (
        <DisqualificationReason reason={String(evalData.disqualification_reason)} />
      )}

      {Boolean(evalData.evaluation_summary) && (
        <EvaluationSummary
          summary={
            evalData.evaluation_summary as {
              strengths?: string[];
              concerns?: string[];
              risk_factors?: string[];
            }
          }
        />
      )}

      {hasImprovementRecommendations && (
        <ImprovementRecommendations recommendations={improvementRecommendations} />
      )}

      {Boolean(evalData.additional_notes) && (
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
          <h4 className="text-sm font-medium mb-2">Additional Notes</h4>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {String(evalData.additional_notes)}
          </p>
        </div>
      )}

      {Boolean(evalData.reviewer_confidence) && (
        <p className="text-xs text-muted-foreground">
          Reviewer Confidence:{" "}
          {String(evalData.reviewer_confidence).charAt(0).toUpperCase() +
            String(evalData.reviewer_confidence).slice(1)}
        </p>
      )}

      {Boolean(evalData.feedback) && (
        <div className="rounded-lg border p-3">
          <h4 className="text-sm font-medium mb-2">Feedback</h4>
          <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {String(evalData.feedback)}
          </div>
        </div>
      )}

      {Boolean(evalData.applicant_guidance) && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
          <h4 className="text-sm font-medium mb-2 text-blue-700 dark:text-blue-400">
            Applicant Guidance
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
            {String(evalData.applicant_guidance)}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {Object.entries(evalData).map(([key, value]) => {
          if (renderedFields.has(key)) return null;
          return (
            <div key={key} className="py-2">
              <h5 className="text-sm font-bold text-zinc-600 dark:text-zinc-400 capitalize mb-1">
                {key.replace(/_/g, " ")}
              </h5>
              <div className="text-sm">
                <RenderedValue value={value} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t">
        <p className="text-sm text-muted-foreground">
          This AI-generated review is for guidance only and may not be fully accurate. You can
          proceed with submission at your discretion.
        </p>
      </div>
    </div>
  );
}

export function AIEvaluationDisplay({
  evaluation,
  isLoading,
  isEnabled,
  className = "",
  hasError = false,
  programName,
}: AIEvaluationDisplayProps) {
  if (!isEnabled) return null;

  return (
    <Card className={cn("shadow-sm", className)} data-testid="ai-evaluation-card">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <CardTitle className="text-sm">AI Evaluation Feedback</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Real-time feedback to help improve your application
        </CardDescription>
      </CardHeader>

      <CardContent data-testid="ai-evaluation-content">
        {hasError ? (
          <div
            className="rounded-lg border border-primary/15 bg-primary/5 p-4"
            data-testid="ai-evaluation-error"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-background text-primary">
                <Info className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  AI feedback is unavailable right now
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Your application can still be submitted. Try again if you want feedback before
                  submitting, or continue without it.
                </p>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div
            className="flex flex-col items-center justify-center py-8"
            data-testid="ai-evaluation-loading"
          >
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Analyzing your application…</p>
          </div>
        ) : evaluation ? (
          (() => {
            const parsed = parseEvaluation(evaluation);
            if (!parsed) {
              return (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600">
                    Failed to parse evaluation data. Please try again.
                  </p>
                </div>
              );
            }
            return <EvaluationDisplay data={parsed} programName={programName} />;
          })()
        ) : (
          <div className="text-center py-8">
            <Info className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Start filling out your application to receive AI feedback
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
