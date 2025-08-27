"use client";

import { cn } from "@/utilities/tailwind";
import {
    XMarkIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    SunIcon,
} from "@heroicons/react/24/outline";
import { JSX } from "react";

export type AIEvaluationData = string;

type GenericJSON = Record<string, unknown>;

interface AIEvaluationDisplayProps {
    evaluation: AIEvaluationData | null;
    isLoading: boolean;
    isEnabled: boolean;
    className?: string;
    hasError?: boolean;
    programName?: string;
}

// Small component for score display
function ScoreDisplay({
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
                    <span className="font-medium">
                        {`Score: ${score}/10`}
                    </span>
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
                        className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            getScoreColor(score)
                        )}
                        style={{ width: `${score * 10}%` }}
                    />
                </div>
            )}
        </div>
    );
}

// Component for decision display
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
        return "text-gray-700 dark:text-gray-300";
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
function DisqualificationReason({ reason }: { reason: string }) {
    return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2 text-red-700 dark:text-red-300">
                Disqualification Reason
            </h4>
            <p className="text-sm text-red-600 dark:text-red-400">
                {reason}
            </p>
        </div>
    );
}

// Component for evaluation summary
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
                    <h5 className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 uppercase tracking-wide">
                        Strengths
                    </h5>
                    <ul className="space-y-1">
                        {summary.strengths.map((strength, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                                <CheckCircleIcon className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700 dark:text-gray-300">{strength}</span>
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
                                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700 dark:text-gray-300">{concern}</span>
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
                                <XMarkIcon className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700 dark:text-gray-300">{risk}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// Component for improvement recommendations
function ImprovementRecommendations({
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
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                {rec.recommendation}
                            </p>
                        )}
                        {rec.impact && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                <strong>Impact:</strong> {rec.impact}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Component for additional notes
function AdditionalNotes({ notes }: { notes: string }) {
    return (
        <div className="bg-gray-100 dark:bg-zinc-800 rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Additional Notes</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">{notes}</p>
        </div>
    );
}

// Component for status chip
function StatusChip({
    status,
    getStatusColor,
}: {
    status: string;
    getStatusColor: (status: string) => string;
}) {
    return (
        <span
            className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium",
                getStatusColor(status)
            )}
        >
            {status?.charAt(0).toUpperCase() + status?.slice(1)}
        </span>
    );
}

interface EvaluationContentProps {
    evaluation: string;
    parseEvaluation: (evaluationStr: string) => GenericJSON | null;
    getScoreIcon: (score: number) => JSX.Element;
    getStatusColor: (status: string) => string;
    getScoreColor: (score: number) => string;
    getPriorityColor: (priority: string) => string;
    programName?: string;
}

// Component to render evaluation data
function EvaluationDisplay({
    data,
    programName,
    getScoreIcon,
    getStatusColor,
    getScoreColor,
    getPriorityColor,
}: {
    data: GenericJSON;
    programName?: string;
    getScoreIcon: (score: number) => JSX.Element;
    getStatusColor: (status: string) => string;
    getScoreColor: (score: number) => string;
    getPriorityColor: (priority: string) => string;
}) {
    // Check if program is audit grants or growth grants
    // const isAuditGrants = programName?.toLowerCase().includes("audit grants");
    // const isGrowthGrants = programName?.toLowerCase().includes("growth grants");
    const isAuditGrants = false;
    const isGrowthGrants = false;

    // Helper to render generic values
    const renderValue = (value: unknown, depth = 0): JSX.Element => {
        if (value === null || value === undefined) {
            return <span className="text-gray-400 dark:text-gray-500">null</span>;
        }

        if (typeof value === "string") {
            return <span className="text-gray-700 dark:text-gray-300">{value}</span>;
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
                            <StatusChip
                                status={evalData.evaluation_status}
                                getStatusColor={getStatusColor}
                            />
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
                    <DecisionDisplay
                        decision={evalData.decision}
                        isAuditGrants={isAuditGrants || false}
                    />
                    {(() => {
                        renderedFields.add("decision");
                        return null;
                    })()}
                </>
            )}

            {/* Disqualification reason */}
            {evalData.disqualification_reason && (
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
                            <div className="text-sm">{renderValue(value)}</div>
                        </div>
                    );
                })}
            </div>

            {/* Footer disclaimer */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    This AI-generated review is for guidance only and may not be fully accurate.
                </p>
            </div>
        </div>
    );
}

function EvaluationContent({
    evaluation,
    parseEvaluation,
    getScoreIcon,
    getStatusColor,
    getScoreColor,
    getPriorityColor,
    programName,
}: EvaluationContentProps) {
    const parsedEvaluation = parseEvaluation(evaluation);

    if (!parsedEvaluation) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">
                    Failed to parse evaluation data. Please try again.
                </p>
            </div>
        );
    }

    // Use the evaluation display component for all evaluation data
    return (
        <EvaluationDisplay
            data={parsedEvaluation}
            programName={programName}
            getScoreIcon={getScoreIcon}
            getStatusColor={getStatusColor}
            getScoreColor={getScoreColor}
            getPriorityColor={getPriorityColor}
        />
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
    if (!isEnabled) {
        return null;
    }

    const parseEvaluation = (evaluationStr: string): GenericJSON | null => {
        try {
            return JSON.parse(evaluationStr);
        } catch (error) {
            console.error("Failed to parse evaluation JSON:", error);
            return null;
        }
    };

    const getScoreColor = (score: number) => {
        if (score > 7) return "bg-green-500";
        if (score >= 4) return "bg-yellow-500";
        return "bg-red-500";
    };

    const getScoreIcon = (score: number) => {
        if (score > 7) return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
        if (score >= 4) return <ExclamationTriangleIcon className="w-5 h-5 text-blue-500" />;
        return <XMarkIcon className="w-5 h-5 text-red-500" />;
    };

    const getPriorityColor = (priority: string) => {
        if (!priority) return "bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200";

        switch (priority.toLowerCase()) {
            case "high":
                return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
            case "medium":
                return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
            case "low":
                return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
            default:
                return "bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200";
        }
    };

    const getStatusColor = (status: string) => {
        if (!status) return "bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200";

        switch (status.toLowerCase()) {
            case "complete":
                return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
            case "incomplete":
                return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
            case "rejected":
                return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
            default:
                return "bg-zinc-100 dark:bg-zinc-700 text-gray-800 dark:text-gray-200";
        }
    };

    return (
        <div className={`${className} shadow-sm`}>
            <div className="flex flex-col gap-1 pb-4 items-start">
                <div className="flex items-start justify-start gap-2">
                    <SunIcon className="w-5 h-5 text-primary animate-pulse" />
                    <h3 className="text-sm font-semibold">AI Evaluation Feedback</h3>
                </div>
                <p className="text-xs text-default-500">
                    Real-time feedback to help improve your application
                </p>
            </div>

            <div className="pt-0">
                {evaluation ? (
                    <EvaluationContent
                        evaluation={evaluation}
                        parseEvaluation={parseEvaluation}
                        getScoreIcon={getScoreIcon}
                        getStatusColor={getStatusColor}
                        getScoreColor={getScoreColor}
                        getPriorityColor={getPriorityColor}
                        programName={programName}
                    />
                ) : (
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
                        <ClockIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">AI evaluation pending</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                            The application will be automatically evaluated by AI shortly after
                            submission.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
