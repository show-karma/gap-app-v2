"use client";

import React, { useState } from "react";
import { cn } from "@/utilities/tailwind";
import type { JudgeResult } from "../types";
import { GitHubInsightsCard } from "./github-insights-card";
import { ScoreCard } from "./score-card";

interface JudgeResultsProps {
  result: JudgeResult;
}

const COMPLETENESS_CONFIG = {
  complete: {
    label: "Complete",
    color: "bg-green-500",
    textColor: "text-green-700 dark:text-green-400",
  },
  partial: {
    label: "Partial",
    color: "bg-yellow-500",
    textColor: "text-yellow-700 dark:text-yellow-400",
  },
  incomplete: {
    label: "Incomplete",
    color: "bg-orange-500",
    textColor: "text-orange-700 dark:text-orange-400",
  },
  abandoned: {
    label: "Abandoned",
    color: "bg-red-500",
    textColor: "text-red-700 dark:text-red-400",
  },
} as const;

function VideoAnalysisSection({ analysis }: { analysis: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30 p-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300">
          Video Analysis (Raw)
        </h3>
        <span className="text-xs text-purple-600 dark:text-purple-400">
          {isExpanded ? "Hide" : "Show"} — proof the AI watched the video
        </span>
      </button>
      {isExpanded && (
        <div className="mt-3 text-sm text-purple-700 dark:text-purple-300 leading-relaxed whitespace-pre-line border-t border-purple-200 dark:border-purple-800 pt-3 max-h-96 overflow-y-auto">
          {analysis}
        </div>
      )}
    </div>
  );
}

function JudgeResultsComponent({ result }: JudgeResultsProps) {
  const scoreColor =
    result.weightedScore >= 80
      ? "text-green-600 dark:text-green-400"
      : result.weightedScore >= 60
        ? "text-yellow-600 dark:text-yellow-400"
        : result.weightedScore >= 40
          ? "text-orange-600 dark:text-orange-400"
          : "text-red-600 dark:text-red-400";

  const completeness =
    COMPLETENESS_CONFIG[result.completenessFlag] || COMPLETENESS_CONFIG.incomplete;

  return (
    <div className="space-y-6">
      {/* TLDR */}
      {result.tldr && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">TLDR</h3>
          <p className="text-sm text-foreground leading-relaxed">{result.tldr}</p>
        </div>
      )}

      {/* Score + Completeness */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-5 text-center">
          <p className="text-xs text-muted-foreground">Overall Score</p>
          <p className={cn("text-4xl font-bold mt-1", scoreColor)}>
            {result.weightedScore}
            <span className="text-sm text-muted-foreground font-normal">/100</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Raw: {result.totalScore}/{result.maxPossibleScore}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 text-center flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground">Completeness</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={cn("h-3 w-3 rounded-full", completeness.color)} />
            <span className={cn("text-lg font-semibold", completeness.textColor)}>
              {completeness.label}
            </span>
          </div>
        </div>
      </div>

      {/* GitHub Insights */}
      {result.githubInsights && <GitHubInsightsCard insights={result.githubInsights} />}

      {/* Video Analysis - proof that Gemini watched the video */}
      {result.videoAnalysis && <VideoAnalysisSection analysis={result.videoAnalysis} />}

      {/* Criteria Scores */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Criteria Scores</h3>
        {result.scores.map((score) => (
          <ScoreCard key={score.criterionId} score={score} />
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Summary</h3>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {result.summary}
        </p>
      </div>

      {result.strengths.length > 0 && (
        <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4">
          <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
            Strengths
          </h3>
          <ul className="space-y-1">
            {result.strengths.map((s, i) => (
              <li key={`strength-${i}`} className="text-sm text-green-700 dark:text-green-400">
                + {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.weaknesses.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">Weaknesses</h3>
          <ul className="space-y-1">
            {result.weaknesses.map((w, i) => (
              <li key={`weakness-${i}`} className="text-sm text-red-700 dark:text-red-400">
                - {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
            Recommendations
          </h3>
          <ul className="space-y-1">
            {result.recommendations.map((r, i) => (
              <li key={`recommendation-${i}`} className="text-sm text-blue-700 dark:text-blue-400">
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export const JudgeResults = React.memo(JudgeResultsComponent);
