"use client";

import {
  AlertOctagon,
  AlertTriangle,
  Check,
  CircleAlert,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import type React from "react";
import { cn } from "@/utilities/tailwind";

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

function ScoreDisplay({ score, isGrowthGrants }: { score: number; isGrowthGrants: boolean }) {
  const getScoreColor = (s: number) => {
    if (s > 7) return "text-green-600";
    if (s >= 4) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (s: number) => {
    if (s > 7) return <Check className="w-5 h-5 text-green-500" />;
    if (s >= 4) return <Info className="w-5 h-5 text-primary" />;
    return <CircleAlert className="w-5 h-5 text-red-500" />;
  };

  const getProbabilityLevel = (s: number) => {
    if (s > 7) return "High";
    if (s >= 4) return "Medium";
    return "Low";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getScoreIcon(score)}
          <span className={cn("font-medium", getScoreColor(score))}>
            {isGrowthGrants ? "Probability of approval" : `Score: ${score}/10`}
          </span>
        </div>
        {isGrowthGrants && (
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              score > 7
                ? "bg-green-100 text-green-700"
                : score >= 4
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
            )}
          >
            {getProbabilityLevel(score)}
          </span>
        )}
      </div>

      {!isGrowthGrants && (
        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all",
              score > 7 ? "bg-green-500" : score >= 4 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${score * 10}%` }}
          />
        </div>
      )}
    </div>
  );
}

function EvaluationSummary({
  summary,
}: {
  summary: {
    strengths?: string[];
    concerns?: string[];
    risk_factors?: string[];
  };
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Evaluation Summary</h4>

      {summary.strengths && summary.strengths.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-green-600 mb-2 uppercase tracking-wide">
            Strengths
          </h5>
          <ul className="space-y-1">
            {summary.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-700 dark:text-zinc-300">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.concerns && summary.concerns.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-yellow-600 mb-2 uppercase tracking-wide">
            Concerns
          </h5>
          <ul className="space-y-1">
            {summary.concerns.map((concern, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-700 dark:text-zinc-300">{concern}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.risk_factors && summary.risk_factors.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-red-600 mb-2 uppercase tracking-wide">
            Risk Factors
          </h5>
          <ul className="space-y-1">
            {summary.risk_factors.map((risk, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <AlertOctagon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-700 dark:text-zinc-300">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ImprovementRecommendations({
  recommendations,
}: {
  recommendations: Array<{
    priority?: string;
    recommendation?: string;
    impact?: string;
  }>;
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "low":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-zinc-100 text-zinc-700";
    }
  };

  return (
    <div>
      <h4 className="text-sm font-medium mb-3">Improvement Recommendations</h4>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-200 dark:border-zinc-600"
          >
            {rec.priority && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full inline-block mb-2",
                  getPriorityColor(rec.priority)
                )}
              >
                {rec.priority.toUpperCase()}
              </span>
            )}
            {rec.recommendation && (
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">{rec.recommendation}</p>
            )}
            {rec.impact && (
              <p className="text-xs text-zinc-500">
                <strong>Impact:</strong> {rec.impact}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function parseEvaluation(evaluationStr: AIEvaluationData): GenericJSON | null {
  try {
    if (typeof evaluationStr === "object" && evaluationStr !== null) {
      return evaluationStr as GenericJSON;
    }
    return JSON.parse(evaluationStr);
  } catch {
    return null;
  }
}

function renderValue(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-zinc-400">null</span>;
  }
  if (typeof value === "string") {
    return <span className="text-zinc-700 dark:text-zinc-300">{value}</span>;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return <span className="text-primary">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-zinc-400">[]</span>;
    return (
      <div className={depth > 0 ? "ml-4" : ""}>
        {value.map((item, index) => (
          <div key={index} className="flex items-start gap-2 my-1">
            <span className="text-zinc-400 select-none">&bull;</span>
            {renderValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-zinc-400">{"{}"}</span>;
    return (
      <div className={depth > 0 ? "ml-4" : ""}>
        {entries.map(([key, val]) => (
          <div key={key} className="my-2">
            <span className="font-medium text-zinc-600 dark:text-zinc-400 capitalize">
              {key.replace(/_/g, " ")}:
            </span>{" "}
            {renderValue(val, depth + 1)}
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-zinc-500 dark:text-zinc-400">{String(value)}</span>;
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

  const isGrowthGrants = programName?.toLowerCase().includes("growth grants") || false;

  return (
    <div
      className={cn("rounded-lg border bg-card shadow-sm", className)}
      data-testid="ai-evaluation-card"
    >
      <div className="flex flex-col gap-1 p-4 pb-2">
        <div className="flex items-start gap-2">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <h3 className="text-sm font-semibold">AI Evaluation Feedback</h3>
        </div>
        <p className="text-xs text-zinc-500">Real-time feedback to help improve your application</p>
      </div>

      <div className="p-4 pt-0" data-testid="ai-evaluation-content">
        {hasError ? (
          <div
            className="flex flex-col items-center justify-center py-8"
            data-testid="ai-evaluation-error"
          >
            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive">
              Failed to load AI evaluation feedback. Please try again.
            </p>
          </div>
        ) : isLoading ? (
          <div
            className="flex flex-col items-center justify-center py-8"
            data-testid="ai-evaluation-loading"
          >
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-zinc-400" />
            <p className="text-sm text-zinc-500">Analyzing your application...</p>
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

            const evalData = parsed as Record<string, unknown>;
            const KNOWN_FIELDS = new Set([
              "final_score",
              "score",
              "evaluation_status",
              "decision",
              "disqualification_reason",
              "evaluation_summary",
              "improvement_recommendations",
              "additional_notes",
              "reviewer_confidence",
            ]);

            return (
              <div className="space-y-4">
                {(evalData.final_score !== undefined || evalData.score !== undefined) && (
                  <ScoreDisplay
                    score={(evalData.final_score as number) || (evalData.score as number) || 0}
                    isGrowthGrants={isGrowthGrants}
                  />
                )}

                {evalData.decision ? (
                  <div className="pb-3 border-b">
                    <h4 className="text-sm font-medium mb-2">Decision</h4>
                    <p className="text-lg font-semibold">
                      {String(evalData.decision).toUpperCase()}
                    </p>
                  </div>
                ) : null}

                {evalData.disqualification_reason ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2 text-red-700 dark:text-red-400">
                      Disqualification Reason
                    </h4>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      {String(evalData.disqualification_reason)}
                    </p>
                  </div>
                ) : null}

                {evalData.evaluation_summary ? (
                  <EvaluationSummary
                    summary={
                      evalData.evaluation_summary as {
                        strengths?: string[];
                        concerns?: string[];
                        risk_factors?: string[];
                      }
                    }
                  />
                ) : null}

                {(
                  evalData.improvement_recommendations as
                    | Array<{
                        priority?: string;
                        recommendation?: string;
                        impact?: string;
                      }>
                    | undefined
                )?.length ? (
                  <ImprovementRecommendations
                    recommendations={
                      evalData.improvement_recommendations as Array<{
                        priority?: string;
                        recommendation?: string;
                        impact?: string;
                      }>
                    }
                  />
                ) : null}

                {evalData.additional_notes ? (
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Additional Notes</h4>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {String(evalData.additional_notes)}
                    </p>
                  </div>
                ) : null}

                {evalData.reviewer_confidence ? (
                  <p className="text-xs text-zinc-400">
                    Reviewer Confidence:{" "}
                    {String(evalData.reviewer_confidence).charAt(0).toUpperCase() +
                      String(evalData.reviewer_confidence).slice(1)}
                  </p>
                ) : null}

                <div className="space-y-2">
                  {Object.entries(evalData).map(([key, value]) => {
                    if (KNOWN_FIELDS.has(key)) return null;
                    return (
                      <div key={key} className="py-2">
                        <h5 className="text-sm font-bold text-zinc-600 dark:text-zinc-400 capitalize mb-1">
                          {key.replace(/_/g, " ")}
                        </h5>
                        <div className="text-sm">{renderValue(value)}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    This AI-generated review is for guidance only and may not be fully accurate. You
                    can proceed with submission at your discretion.
                  </p>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="text-center py-8">
            <Info className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">
              Start filling out your application to receive AI feedback
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
