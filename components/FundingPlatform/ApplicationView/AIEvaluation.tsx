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

interface ParsedEvaluation {
    final_score?: number;
    evaluation_status?: string;
    disqualification_reason?: string;
    evaluation_summary?: {
        strengths?: string[];
        concerns?: string[];
        risk_factors?: string[];
    };
    improvement_recommendations?: Array<{
        priority?: string;
        recommendation?: string;
        impact?: string;
    }>;
    reviewer_confidence?: string;
    additional_notes?: string;
}

type GenericJSON = Record<string, unknown>;

interface AIEvaluationDisplayProps {
    evaluation: AIEvaluationData | null;
    isLoading: boolean;
    isEnabled: boolean;
    className?: string;
    hasError?: boolean;
    programName?: string;
}

interface EvaluationContentProps {
    evaluation: string;
    parseEvaluation: (
        evaluationStr: string,
    ) => ParsedEvaluation | GenericJSON | null;
    getScoreIcon: (score: number) => JSX.Element;
    getStatusColor: (
        status: string,
    ) => string;
    getScoreColor: (
        score: number,
    ) => string;
    getPriorityColor: (
        priority: string,
    ) => string;
    programName?: string;
}

// Helper function to check if the data matches ParsedEvaluation format
function isParsedEvaluation(data: unknown): data is ParsedEvaluation {
    if (!data || typeof data !== "object") return false;
    const obj = data as Record<string, unknown>;
    // Check for key fields that indicate it's a ParsedEvaluation
    return (
        "final_score" in obj ||
        "evaluation_status" in obj ||
        "evaluation_summary" in obj ||
        "improvement_recommendations" in obj
    );
}

// Component to render generic JSON in a readable format
function GenericJSONDisplay({ data, programName }: { data: GenericJSON; programName?: string }) {
    const renderValue = (value: unknown, depth = 0): JSX.Element => {
        // Handle different value types
        if (value === null || value === undefined) {
            return <span className="text-default-400">null</span>;
        }

        if (typeof value === "string") {
            return <span className="text-default-700">{value}</span>;
        }

        if (typeof value === "number" || typeof value === "boolean") {
            return <span className="text-primary-600">{String(value)}</span>;
        }

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return <span className="text-default-400">[]</span>;
            }
            return (
                <div className={depth > 0 ? "ml-4" : ""}>
                    {value.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 my-1">
                            <span className="text-default-400 select-none">•</span>
                            {renderValue(item, depth + 1)}
                        </div>
                    ))}
                </div>
            );
        }

        if (typeof value === "object") {
            const entries = Object.entries(value as Record<string, unknown>);
            if (entries.length === 0) {
                return <span className="text-default-400">{"{}"}</span>;
            }
            return (
                <div className={depth > 0 ? "ml-4" : ""}>
                    {entries.map(([key, val]) => (
                        <div key={key} className="my-2">
                            <span className="font-medium text-default-600 capitalize">
                                {key.replace(/_/g, " ")}:
                            </span>{" "}
                            {renderValue(val, depth + 1)}
                        </div>
                    ))}
                </div>
            );
        }

        return <span className="text-default-500">{String(value)}</span>;
    };

    // Special handling for common evaluation fields
    const getDecisionColor = (decision: string) => {
        const dec = decision.toLowerCase();
        if (dec === "reject" || dec === "rejected") return "text-danger-600";
        if (
            dec === "accept" ||
            dec === "accepted" ||
            dec === "approve" ||
            dec === "approved"
        )
            return "text-success-600";
        if (dec === "pending" || dec === "review") return "text-warning-600";
        return "text-default-700";
    };

    // Check if program is audit grants or growth grants
    const isAuditGrants = programName?.toLowerCase().includes("audit grants");
    const isGrowthGrants = programName?.toLowerCase().includes("growth grants");

    // Check if it has a decision field for special formatting
    const hasDecision = "decision" in data;
    const decision = hasDecision ? String(data?.decision) : null;

    // Map decision values for audit grants
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

    // Get the display label for decision field
    const getDecisionLabel = () => {
        if (isAuditGrants) return "Probability of approval";
        return "Decision";
    };

    return (
        <div className="space-y-3">
            {decision && (
                <div className="pb-3 border-b border-divider">
                    <h4 className="text-sm font-medium mb-2">{getDecisionLabel()}</h4>
                    <p className={`text-lg font-semibold ${getDecisionColor(decision)}`}>
                        {getDecisionDisplay(decision)}
                    </p>
                </div>
            )}

            <div className="space-y-2">
                {Object.entries(data).map(([key, value]) => {
                    // Skip decision if already displayed
                    if (key === "decision" && hasDecision) return null;

                    // Handle score field for growth grants
                    if (isGrowthGrants && (key.toLowerCase() === "score" || key === "final_score")) {
                        const scoreValue = typeof value === "number" ? value : parseFloat(String(value));
                        let probabilityLevel = "Low";
                        let probabilityColor = "text-danger-600";

                        if (scoreValue > 7) {
                            probabilityLevel = "High";
                            probabilityColor = "text-success-600";
                        } else if (scoreValue >= 4) {
                            probabilityLevel = "Medium";
                            probabilityColor = "text-warning-600";
                        }

                        return (
                            <div key={key} className="py-2">
                                <h5 className="text-sm font-medium text-default-600 mb-1">
                                    Probability of approval
                                </h5>
                                <div className="text-sm">
                                    <span className={`font-semibold ${probabilityColor}`}>
                                        {probabilityLevel}
                                    </span>
                                </div>
                            </div>
                        );
                    }

                    // Default rendering for other fields
                    return (
                        <div key={key} className="py-2">
                            <h5 className="text-sm font-medium text-default-600 capitalize mb-1">
                                {key.replace(/_/g, " ")}
                            </h5>
                            <div className="text-sm">{renderValue(value)}</div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-3 border-t border-divider">
                <p className="text-sm text-default-600 dark:text-default-400">This AI-generated review is for guidance only and may not be fully accurate.</p>
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
            <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
                <p className="text-sm text-danger-600">
                    Failed to parse evaluation data. Please try again.
                </p>
            </div>
        );
    }

    // Check if it's a ParsedEvaluation or generic JSON
    if (!isParsedEvaluation(parsedEvaluation)) {
        // Render as generic JSON
        return <GenericJSONDisplay data={parsedEvaluation as GenericJSON} programName={programName} />;
    }

    // Check if program is growth grants for score display
    const isGrowthGrants = programName?.toLowerCase().includes("growth grants");

    const getProbabilityOfApproval = () => {
        const score = parsedEvaluation.final_score || 0;
        let probability = "Low";
        if (score > 7) probability = "High";
        else if (score >= 4) probability = "Medium";
        return probability;
    }

    return (
        <div className="space-y-4">
            {/* Score and Status */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {getScoreIcon(parsedEvaluation?.final_score || 0)}
                        <span className="font-medium">
                            {isGrowthGrants ? (
                                `Probability of approval`
                            ) : (
                                `Score: ${parsedEvaluation.final_score || 0}/10`
                            )}
                        </span>
                    </div>
                    {isGrowthGrants ?
                        <span
                            className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium",
                                getStatusColor(parsedEvaluation.evaluation_status || "")
                            )}
                        >
                            {getProbabilityOfApproval()}
                        </span>
                        : <span
                            className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium",
                                getStatusColor(parsedEvaluation.evaluation_status || "")
                            )}
                        >
                            {parsedEvaluation.evaluation_status!.charAt(0).toUpperCase() +
                                parsedEvaluation.evaluation_status?.slice(1)}
                        </span>}
                </div>

                {isGrowthGrants ? null : <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                    <div
                        className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            getScoreColor(parsedEvaluation.final_score || 0)
                        )}
                        style={{ width: `${(parsedEvaluation.final_score || 0) * 10}%` }}
                    />
                </div>}
            </div>

            {/* Disqualification Reason */}
            {parsedEvaluation.disqualification_reason && (
                <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2 text-danger-700">
                        Disqualification Reason
                    </h4>
                    <p className="text-sm text-danger-600">
                        {parsedEvaluation.disqualification_reason}
                    </p>
                </div>
            )}

            {/* Evaluation Summary */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium">Evaluation Summary</h4>

                {/* Strengths */}
                {(parsedEvaluation?.evaluation_summary?.strengths
                    ? parsedEvaluation?.evaluation_summary?.strengths?.length
                    : 0) > 0 && (
                        <div>
                            <h5 className="text-xs font-medium text-success-600 mb-2 uppercase tracking-wide">
                                Strengths
                            </h5>
                            <ul className="space-y-1">
                                {parsedEvaluation.evaluation_summary?.strengths?.map(
                                    (strength, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm">
                                            <CheckCircleIcon className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                            <span className="text-default-700">{strength}</span>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </div>
                    )}

                {/* Concerns */}
                {(parsedEvaluation?.evaluation_summary?.concerns
                    ? parsedEvaluation?.evaluation_summary?.concerns?.length
                    : 0) > 0 && (
                        <div>
                            <h5 className="text-xs font-medium text-warning-600 mb-2 uppercase tracking-wide">
                                Concerns
                            </h5>
                            <ul className="space-y-1">
                                {parsedEvaluation?.evaluation_summary?.concerns?.map(
                                    (concern, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm">
                                            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                            <span className="text-default-700">{concern}</span>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </div>
                    )}

                {/* Risk Factors */}
                {(parsedEvaluation?.evaluation_summary?.risk_factors
                    ? parsedEvaluation?.evaluation_summary?.risk_factors?.length
                    : 0) > 0 && (
                        <div>
                            <h5 className="text-xs font-medium text-danger-600 mb-2 uppercase tracking-wide">
                                Risk Factors
                            </h5>
                            <ul className="space-y-1">
                                {parsedEvaluation?.evaluation_summary?.risk_factors?.map(
                                    (risk, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm">
                                            <XMarkIcon className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                            <span className="text-default-700">{risk}</span>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </div>
                    )}
            </div>

            {/* Improvement Recommendations */}
            {(parsedEvaluation?.improvement_recommendations
                ? parsedEvaluation?.improvement_recommendations?.length
                : 0) > 0 && (
                    <div>
                        <h4 className="text-sm font-medium mb-3">
                            Improvement Recommendations
                        </h4>
                        <div className="space-y-3">
                            {parsedEvaluation?.improvement_recommendations?.map(
                                (rec, index) => (
                                    <div
                                        key={index}
                                        className="bg-default-50 rounded-lg p-3 border border-zinc-200 dark:border-zinc-600"
                                    >
                                        <div className="flex items-start gap-2 mb-2">
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
                                                </div>)}
                                        </div>
                                        <p className="text-sm text-default-700 mb-2">
                                            {rec.recommendation}
                                        </p>
                                        <p className="text-xs text-default-500">
                                            <strong>Impact:</strong> {rec.impact}
                                        </p>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                )}

            {/* Additional Notes */}
            {parsedEvaluation.additional_notes && (
                <div className="bg-default-100 rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Additional Notes</h4>
                    <p className="text-sm text-default-700">
                        {parsedEvaluation.additional_notes}
                    </p>
                </div>
            )}

            <p className="text-xs text-default-400">
                Reviewer Confidence:{" "}
                {parsedEvaluation.reviewer_confidence
                    ? parsedEvaluation.reviewer_confidence?.charAt(0).toUpperCase() +
                    parsedEvaluation.reviewer_confidence?.slice(1)
                    : null}
            </p>
            {/* Metadata */}
            <div className="pt-3 border-t border-divider">
                <p className="text-sm text-default-600 dark:text-default-400">This AI-generated review is for guidance only and may not be fully accurate.</p>
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
    if (!isEnabled) {
        return null;
    }

    const parseEvaluation = (
        evaluationStr: string,
    ): ParsedEvaluation | GenericJSON | null => {
        try {
            return JSON.parse(evaluationStr);
        } catch (error) {
            console.error("Failed to parse evaluation JSON:", error);
            return null;
        }
    };

    const getScoreColor = (
        score: number,
    ) => {
        if (score > 7) return "bg-green-500";
        if (score >= 4) return "bg-yellow-500";
        return "bg-red-500";
    };

    const getScoreIcon = (score: number) => {
        if (score > 7) return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
        if (score >= 4) return <ExclamationTriangleIcon className="w-5 h-5 text-blue-500" />;
        return <XMarkIcon className="w-5 h-5 text-red-500" />;
    };

    const getPriorityColor = (
        priority: string,
    ) => {
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

    const getStatusColor = (
        status: string,
    ) => {
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
