"use client";

import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { JSX } from "react";
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview";
import { cn } from "@/utilities/tailwind";
import {
  type GenericJSON,
  getPriorityColor,
  getScoreColor,
  getScoreIcon,
  getStatusColor,
} from "./evaluationUtils";

// Small component for score display
export function ScoreDisplay({
  score,
  isGrowthGrants,
  getScoreIcon,
  getScoreColor,
}: {
  score: number;
  isGrowthGrants: boolean;
  getScoreIcon: (score: number) => JSX.Element;
  getScoreColor: (score: number) => string;
}) {
  const getProbabilityLevel = (score: number) => {
    if (score > 7) return "High";
    if (score >= 4) return "Medium";
    return "Low";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getScoreIcon(score)}
          <span className="font-medium">{`Score: ${score}/10`}</span>
        </div>
        {isGrowthGrants && (
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-medium",
              score > 7
                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                : score >= 4
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                  : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
            )}
          >
            {getProbabilityLevel(score)}
          </span>
        )}
      </div>

      {!isGrowthGrants && (
        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
          <div
            className={cn("h-2 rounded-full transition-all duration-300", getScoreColor(score))}
            style={{ width: `${score * 10}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Component for decision display
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
    return "text-gray-700 dark:text-gray-300";
  };

  const getDecisionDisplay = (value: string) => {
    if (!isAuditGrants) return value.toUpperCase();

    const decisionMap: Record<string, string> = {
      PASS: "High",
      NO_PASS: "Medium",
      REJECT: "Low",
    };

    const upperValue = value.toUpperCase();
    return decisionMap[upperValue] || upperValue;
  };

  return (
    <div className="pb-3 border-b border-zinc-200 dark:border-zinc-700">
      <h4 className="text-sm font-medium mb-2">
        {isAuditGrants ? "Probability of approval" : "Decision"}
      </h4>
      <p className={`text-lg font-semibold ${getDecisionColor(decision)}`}>
        {getDecisionDisplay(decision)}
      </p>
    </div>
  );
}

// Component for disqualification reason
export function DisqualificationReason({ reason }: { reason: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
      <h4 className="text-sm font-medium mb-2 text-red-700 dark:text-red-300">
        Disqualification Reason
      </h4>
      <div className="text-sm text-red-600 dark:text-red-400">
        <MarkdownPreview source={reason} />
      </div>
    </div>
  );
}

// Component for evaluation summary
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
          <h5 className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 uppercase tracking-wide">
            Strengths
          </h5>
          <ul className="space-y-1">
            {summary.strengths.map((strength, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircleIcon className="w-4 h-4 text-green-500 dark:text-green-400 mt-1 flex-shrink-0" />
                <div className="flex-1 text-gray-700 dark:text-gray-300">
                  <MarkdownPreview source={strength} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.concerns && summary.concerns.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-2 uppercase tracking-wide">
            Concerns
          </h5>
          <ul className="space-y-1">
            {summary.concerns.map((concern, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400 mt-1 flex-shrink-0" />
                <div className="flex-1 text-gray-700 dark:text-gray-300">
                  <MarkdownPreview source={concern} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.risk_factors && summary.risk_factors.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-red-600 dark:text-red-400 mb-2 uppercase tracking-wide">
            Risk Factors
          </h5>
          <ul className="space-y-1">
            {summary.risk_factors.map((risk, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <XMarkIcon className="w-4 h-4 text-red-500 dark:text-red-400 mt-1 flex-shrink-0" />
                <div className="flex-1 text-gray-700 dark:text-gray-300">
                  <MarkdownPreview source={risk} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Component for improvement recommendations
export function ImprovementRecommendations({
  recommendations,
  getPriorityColor,
}: {
  recommendations: Array<{
    priority?: string;
    recommendation?: string;
    impact?: string;
  }>;
  getPriorityColor: (priority: string) => string;
}) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-3">Improvement Recommendations</h4>
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 border border-zinc-200 dark:border-zinc-600"
          >
            {rec.priority && (
              <div className="mb-2">
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                    getPriorityColor(rec.priority)
                  )}
                >
                  {rec.priority.toUpperCase()}
                </span>
              </div>
            )}
            {rec.recommendation && (
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <MarkdownPreview source={rec.recommendation} />
              </div>
            )}
            {rec.impact && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <strong>Impact:</strong> <MarkdownPreview source={rec.impact} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Component for additional notes
export function AdditionalNotes({ notes }: { notes: string }) {
  return (
    <div className="bg-gray-100 dark:bg-zinc-800 rounded-lg p-3">
      <h4 className="text-sm font-medium mb-2">Additional Notes</h4>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        <MarkdownPreview source={notes} />
      </div>
    </div>
  );
}

// Component for status chip
export function StatusChip({
  status,
  getStatusColor,
}: {
  status: string;
  getStatusColor: (status: string) => string;
}) {
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", getStatusColor(status))}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}

interface EvaluationDisplayProps {
  data: GenericJSON;
  programName?: string;
  getScoreIcon: (score: number) => JSX.Element;
  getStatusColor: (status: string) => string;
  getScoreColor: (score: number) => string;
  getPriorityColor: (priority: string) => string;
  footerDisclaimer?: string;
}

// Component to render evaluation data
export function EvaluationDisplay({
  data,
  programName,
  getScoreIcon,
  getStatusColor,
  getScoreColor,
  getPriorityColor,
  footerDisclaimer,
}: EvaluationDisplayProps) {
  // Check if program is audit grants or growth grants
  const isAuditGrants = false;
  const isGrowthGrants = false;

  // Helper to render generic values
  const renderValue = (value: unknown, depth = 0): JSX.Element => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 dark:text-gray-500">null</span>;
    }

    if (typeof value === "string") {
      return (
        <div className="text-gray-700 dark:text-gray-300">
          <MarkdownPreview source={value} />
        </div>
      );
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-400 dark:text-gray-500">[]</span>;
      }
      return (
        <div className={depth > 0 ? "ml-4" : ""}>
          {value.map((item, index) => (
            <div key={index} className="flex items-start gap-2 my-1">
              <span className="text-gray-400 dark:text-gray-500 select-none">•</span>
              {renderValue(item, depth + 1)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        return <span className="text-gray-400 dark:text-gray-500">{"{}"}</span>;
      }
      return (
        <div className={depth > 0 ? "ml-4" : ""}>
          {entries.map(([key, val]) => (
            <div key={key} className="my-2">
              <span className="font-medium text-gray-600 dark:text-gray-400 capitalize">
                {key.replace(/_/g, " ")}:
              </span>{" "}
              {renderValue(val, depth + 1)}
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-gray-500 dark:text-gray-400">{String(value)}</span>;
  };

  const evalData = data as any;
  const renderedFields = new Set<string>();

  return (
    <div className="space-y-4">
      {/* Score display with status chip */}
      {(evalData.final_score !== undefined || evalData.score !== undefined) && (
        <>
          <ScoreDisplay
            score={evalData.final_score || evalData.score || 0}
            isGrowthGrants={isGrowthGrants || false}
            getScoreIcon={getScoreIcon}
            getScoreColor={getScoreColor}
          />
          {!isGrowthGrants && evalData.evaluation_status && (
            <div className="mt-2">
              <StatusChip status={evalData.evaluation_status} getStatusColor={getStatusColor} />
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

      {/* Decision display */}
      {evalData.decision && (
        <>
          <DecisionDisplay decision={evalData.decision} isAuditGrants={isAuditGrants || false} />
          {(() => {
            renderedFields.add("decision");
            return null;
          })()}
        </>
      )}

      {/* Disqualification reason */}
      {evalData.disqualification_reason && evalData.disqualification_reason !== "null" && (
        <>
          <DisqualificationReason reason={evalData.disqualification_reason} />
          {(() => {
            renderedFields.add("disqualification_reason");
            return null;
          })()}
        </>
      )}

      {/* Evaluation Summary */}
      {evalData.evaluation_summary && (
        <>
          <EvaluationSummary summary={evalData.evaluation_summary} />
          {(() => {
            renderedFields.add("evaluation_summary");
            return null;
          })()}
        </>
      )}

      {/* Improvement Recommendations */}
      {evalData.improvement_recommendations?.length > 0 && (
        <>
          <ImprovementRecommendations
            recommendations={evalData.improvement_recommendations}
            getPriorityColor={getPriorityColor}
          />
          {(() => {
            renderedFields.add("improvement_recommendations");
            return null;
          })()}
        </>
      )}

      {/* Additional Notes */}
      {evalData.additional_notes && (
        <>
          <AdditionalNotes notes={evalData.additional_notes} />
          {(() => {
            renderedFields.add("additional_notes");
            return null;
          })()}
        </>
      )}

      {/* Reviewer confidence */}
      {evalData.reviewer_confidence && (
        <>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Reviewer Confidence:{" "}
            {evalData.reviewer_confidence?.charAt(0).toUpperCase() +
              evalData.reviewer_confidence?.slice(1)}
          </p>
          {(() => {
            renderedFields.add("reviewer_confidence");
            return null;
          })()}
        </>
      )}

      {/* Generic rendering for any remaining fields */}
      <div className="space-y-2">
        {Object.entries(evalData).map(([key, value]) => {
          // Skip already rendered fields
          if (renderedFields.has(key)) return null;

          return (
            <div key={key} className="py-2">
              <h5 className="text-sm font-bold text-gray-600 dark:text-gray-400 capitalize mb-1">
                {key.replace(/_/g, " ")}
              </h5>
              <div className="text-sm">{value ? renderValue(value) : "Not available"}</div>
            </div>
          );
        })}
      </div>

      {/* Footer disclaimer */}
      {footerDisclaimer && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">{footerDisclaimer}</p>
        </div>
      )}
    </div>
  );
}
