"use client";

import { AlertOctagon, AlertTriangle, Check, CircleAlert, Info } from "lucide-react";
import { cn } from "@/utilities/tailwind";

export function ScoreDisplay({
  score,
  isGrowthGrants,
}: {
  score: number;
  isGrowthGrants: boolean;
}) {
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

  // Tailwind JIT can't see dynamic widths, so map the clamped score (0-10) to
  // a literal width utility class. Score is already validated 0-10 in the parent.
  const getScoreWidthClass = (s: number) => {
    const bucket = Math.max(0, Math.min(10, Math.round(s)));
    return [
      "w-0",
      "w-[10%]",
      "w-[20%]",
      "w-[30%]",
      "w-[40%]",
      "w-[50%]",
      "w-[60%]",
      "w-[70%]",
      "w-[80%]",
      "w-[90%]",
      "w-full",
    ][bucket];
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
            className={cn(
              "h-2 rounded-full transition-all",
              getScoreBarColor(score),
              getScoreWidthClass(score)
            )}
          />
        </div>
      )}
    </div>
  );
}

export function DecisionDisplay({
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

export function DisqualificationReason({ reason }: { reason: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
      <h4 className="text-sm font-medium mb-2 text-red-700 dark:text-red-400">
        Disqualification Reason
      </h4>
      <p className="text-sm text-red-600 dark:text-red-300">{reason}</p>
    </div>
  );
}

export function EvaluationSummary({
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
            {summary.strengths.map((strength) => (
              <li key={strength} className="flex items-start gap-2 text-sm">
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
            {summary.concerns.map((concern) => (
              <li key={concern} className="flex items-start gap-2 text-sm">
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
            {summary.risk_factors.map((risk) => (
              <li key={risk} className="flex items-start gap-2 text-sm">
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

export function ImprovementRecommendations({
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
            key={`${rec.priority ?? "p"}-${rec.recommendation ?? index}`}
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

export function StatusChip({ status }: { status: string }) {
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
