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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const getScoreBarColor = (s: number) => {
    if (s > 7) return "bg-green-500";
    if (s >= 4) return "bg-yellow-500";
    return "bg-red-500";
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

  const getChipVariant = (s: number) => {
    if (s > 7) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (s >= 4) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
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
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
              getChipVariant(score)
            )}
          >
            {getProbabilityLevel(score)}
          </span>
        )}
      </div>

      {!isGrowthGrants && (
        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
          <div
            className={cn("h-2 rounded-full transition-all", getScoreBarColor(score))}
            style={{ width: `${score * 10}%` }}
          />
        </div>
      )}
    </div>
  );
}

function DecisionDisplay({
  decision,
  isAuditGrants,
}: {
  decision: string;
  isAuditGrants: boolean;
}) {
  const getDecisionColor = (value: string) => {
    const val = value.toLowerCase();
    if (val === "reject" || val === "rejected" || val === "low")
      return "text-red-600 dark:text-red-400";
    if (
      val === "accept" ||
      val === "accepted" ||
      val === "approve" ||
      val === "approved" ||
      val === "high"
    )
      return "text-green-600 dark:text-green-400";
    if (val === "pending" || val === "review" || val === "medium")
      return "text-yellow-600 dark:text-yellow-400";
    return "text-foreground";
  };

  const getDecisionDisplay = (value: string) => {
    if (!isAuditGrants) return value.toUpperCase();
    const upperValue = value.toUpperCase();
    switch (upperValue) {
      case "PASS":
        return "High";
      case "NO_PASS":
        return "Medium";
      case "REJECT":
        return "Low";
      default:
        return upperValue;
    }
  };

  return (
    <div className="pb-3 border-b">
      <h4 className="text-sm font-medium mb-2">
        {isAuditGrants ? "Probability of approval" : "Decision"}
      </h4>
      <p className={cn("text-lg font-semibold", getDecisionColor(decision))}>
        {getDecisionDisplay(decision)}
      </p>
    </div>
  );
}

function DisqualificationReason({ reason }: { reason: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
      <h4 className="text-sm font-medium mb-2 text-red-700 dark:text-red-400">
        Disqualification Reason
      </h4>
      <p className="text-sm text-red-600 dark:text-red-300">{reason}</p>
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
  const getPriorityVariant = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
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
              <div className="mb-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    getPriorityVariant(rec.priority)
                  )}
                >
                  {rec.priority.toUpperCase()}
                </span>
              </div>
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

function StatusChip({ status }: { status: string }) {
  const getStatusVariant = (s: string) => {
    switch (s?.toLowerCase()) {
      case "complete":
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "incomplete":
      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        getStatusVariant(status)
      )}
    >
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
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
        {value.map((item, index) => (
          <div key={index} className="flex items-start gap-2 my-1">
            <span className="text-muted-foreground select-none">&bull;</span>
            {renderValue(item, depth + 1)}
          </div>
        ))}
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
            {renderValue(val, depth + 1)}
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic JSON from API
  const evalData = data as Record<string, any>;
  const renderedFields = new Set<string>();

  return (
    <div className="space-y-4">
      {(evalData.final_score !== undefined || evalData.score !== undefined) && (
        <>
          <ScoreDisplay
            score={evalData.final_score || evalData.score || 0}
            isGrowthGrants={isGrowthGrants}
          />
          {!isGrowthGrants && evalData.evaluation_status && (
            <div className="mt-2">
              <StatusChip status={String(evalData.evaluation_status)} />
            </div>
          )}
          {(() => {
            renderedFields.add("final_score");
            renderedFields.add("score");
            renderedFields.add("evaluation_status");
            return null;
          })()}
        </>
      )}

      {evalData.decision && (
        <>
          <DecisionDisplay decision={String(evalData.decision)} isAuditGrants={isAuditGrants} />
          {(() => {
            renderedFields.add("decision");
            return null;
          })()}
        </>
      )}

      {evalData.disqualification_reason && (
        <>
          <DisqualificationReason reason={String(evalData.disqualification_reason)} />
          {(() => {
            renderedFields.add("disqualification_reason");
            return null;
          })()}
        </>
      )}

      {evalData.evaluation_summary && (
        <>
          <EvaluationSummary
            summary={
              evalData.evaluation_summary as {
                strengths?: string[];
                concerns?: string[];
                risk_factors?: string[];
              }
            }
          />
          {(() => {
            renderedFields.add("evaluation_summary");
            return null;
          })()}
        </>
      )}

      {evalData.improvement_recommendations?.length ? (
        <>
          <ImprovementRecommendations
            recommendations={
              evalData.improvement_recommendations as Array<{
                priority?: string;
                recommendation?: string;
                impact?: string;
              }>
            }
          />
          {(() => {
            renderedFields.add("improvement_recommendations");
            return null;
          })()}
        </>
      ) : null}

      {evalData.additional_notes && (
        <>
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Additional Notes</h4>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {String(evalData.additional_notes)}
            </p>
          </div>
          {(() => {
            renderedFields.add("additional_notes");
            return null;
          })()}
        </>
      )}

      {evalData.reviewer_confidence && (
        <>
          <p className="text-xs text-muted-foreground">
            Reviewer Confidence:{" "}
            {String(evalData.reviewer_confidence).charAt(0).toUpperCase() +
              String(evalData.reviewer_confidence).slice(1)}
          </p>
          {(() => {
            renderedFields.add("reviewer_confidence");
            return null;
          })()}
        </>
      )}

      {/* Feedback field — render with whitespace preserved */}
      {evalData.feedback && (
        <>
          <div className="rounded-lg border p-3">
            <h4 className="text-sm font-medium mb-2">Feedback</h4>
            <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {String(evalData.feedback)}
            </div>
          </div>
          {(() => {
            renderedFields.add("feedback");
            return null;
          })()}
        </>
      )}

      {/* Applicant guidance — styled as a tip box */}
      {evalData.applicant_guidance && (
        <>
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
            <h4 className="text-sm font-medium mb-2 text-blue-700 dark:text-blue-400">
              Applicant Guidance
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
              {String(evalData.applicant_guidance)}
            </p>
          </div>
          {(() => {
            renderedFields.add("applicant_guidance");
            return null;
          })()}
        </>
      )}

      {/* Title field — skip rendering as generic since it's shown in the header context */}
      {(() => {
        renderedFields.add("title");
        return null;
      })()}

      {/* Generic rendering for any remaining fields */}
      <div className="space-y-2">
        {Object.entries(evalData).map(([key, value]) => {
          if (renderedFields.has(key)) return null;
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

      {/* Footer disclaimer */}
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
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Analyzing your application...</p>
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
