"use client";

import React from "react";
import { cn } from "@/utilities/tailwind";
import type { GitHubInsights } from "../types";

interface GitHubInsightsCardProps {
  insights: GitHubInsights;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTopLanguages(languages: Record<string, number>): string[] {
  return Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([lang]) => lang);
}

function GitHubInsightsCardComponent({ insights }: GitHubInsightsCardProps) {
  const topLanguages = getTopLanguages(insights.languages);
  const hasAiUsage = insights.aiToolUsage.totalAiCommits > 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">GitHub Insights</h3>
        <a
          href={insights.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          View repo
        </a>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{insights.totalCommits}</p>
          <p className="text-xs text-muted-foreground">Commits</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{insights.contributors}</p>
          <p className="text-xs text-muted-foreground">Contributors</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{topLanguages[0] || "N/A"}</p>
          <p className="text-xs text-muted-foreground">Primary Language</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>First commit: {formatDate(insights.firstCommitDate)}</span>
        <span>Last commit: {formatDate(insights.lastCommitDate)}</span>
      </div>

      {/* Languages */}
      {topLanguages.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {topLanguages.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {lang}
            </span>
          ))}
        </div>
      )}

      {/* Fork warning */}
      {insights.isFork && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">This is a forked repository</p>
      )}

      {/* AI Tool Usage */}
      <div
        className={cn(
          "rounded-md p-3",
          hasAiUsage
            ? "bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900"
            : "bg-muted/50"
        )}
      >
        <p className="text-xs font-medium text-foreground mb-1">AI Tool Usage</p>
        {hasAiUsage ? (
          <>
            <p className="text-sm text-purple-700 dark:text-purple-400">
              {insights.aiToolUsage.totalAiCommits} of {insights.aiToolUsage.totalCommitsAnalyzed}{" "}
              commits ({insights.aiToolUsage.percentage}%) mention AI tools
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {insights.aiToolUsage.aiToolMentions.map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 text-xs text-purple-700 dark:text-purple-300"
                >
                  {tool}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            No AI tool mentions detected in commit messages
          </p>
        )}
      </div>
    </div>
  );
}

export const GitHubInsightsCard = React.memo(GitHubInsightsCardComponent);
