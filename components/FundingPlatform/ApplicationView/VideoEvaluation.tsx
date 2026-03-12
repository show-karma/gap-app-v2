"use client";

import { ClockIcon, FilmIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { VideoPreview } from "@/src/features/judge-agent/components/video-preview";
import type { IFundingApplication } from "@/types/funding-platform";

interface VideoEvaluationDisplayProps {
  application: IFundingApplication;
  className?: string;
}

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color =
    pct >= 70
      ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
      : pct >= 40
        ? "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"
        : "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {score}/{max}
    </span>
  );
}

function CompletenessFlag({ flag }: { flag: string }) {
  const styles: Record<string, string> = {
    complete: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    partial: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    incomplete: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    abandoned: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[flag] || "bg-gray-100 text-gray-700"}`}
    >
      {flag}
    </span>
  );
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

function GitHubInsightsSection({ insights }: { insights: any }) {
  const topLanguages = insights.languages ? getTopLanguages(insights.languages) : [];
  const hasAiUsage = insights.aiToolUsage?.totalAiCommits > 0;

  return (
    <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          GitHub Insights
        </h4>
        {insights.repoUrl && (
          <a
            href={insights.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            View repo
          </a>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{insights.totalCommits}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Commits</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{insights.contributors}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Contributors</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {topLanguages[0] || "N/A"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Primary Language</p>
        </div>
      </div>

      {/* Timeline */}
      {(insights.firstCommitDate || insights.lastCommitDate) && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>First commit: {formatDate(insights.firstCommitDate)}</span>
          <span>Last commit: {formatDate(insights.lastCommitDate)}</span>
        </div>
      )}

      {/* Languages */}
      {topLanguages.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {topLanguages.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center rounded-full bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300"
            >
              {lang}
            </span>
          ))}
        </div>
      )}

      {/* Fork warning */}
      {insights.isFork && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          ⚠ This is a forked repository
        </p>
      )}

      {/* AI Tool Usage */}
      {insights.aiToolUsage && (
        <div
          className={
            hasAiUsage
              ? "rounded-md p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800"
              : "rounded-md p-3 bg-gray-100 dark:bg-zinc-700/50"
          }
        >
          <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">AI Tool Usage</p>
          {hasAiUsage ? (
            <>
              <p className="text-sm text-purple-700 dark:text-purple-400">
                {insights.aiToolUsage.totalAiCommits} of {insights.aiToolUsage.totalCommitsAnalyzed}{" "}
                commits ({insights.aiToolUsage.percentage}%) mention AI tools
              </p>
              {insights.aiToolUsage.aiToolMentions?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {insights.aiToolUsage.aiToolMentions.map((tool: string) => (
                    <span
                      key={tool}
                      className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 text-xs text-purple-700 dark:text-purple-300"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No AI tool mentions detected in commit messages
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function findVideoUrl(appData: Record<string, any>): string | undefined {
  const patterns = ["video", "demo", "youtube", "loom"];
  for (const [key, value] of Object.entries(appData)) {
    const nk = key.toLowerCase().replace(/[\s_-]+/g, "");
    if (patterns.some((p) => nk.includes(p)) && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

export const VideoEvaluationDisplay: FC<VideoEvaluationDisplayProps> = ({
  application,
  className = "",
}) => {
  const videoEval = application.videoEvaluation;
  const videoUrl = findVideoUrl(application.applicationData || {});

  return (
    <div className={className}>
      <div className="flex flex-col gap-1 pb-4 items-start">
        <div className="flex items-start justify-start gap-2">
          <FilmIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold">Video & Demo Review</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          AI-powered analysis of the demo video, GitHub repo, and project data. For reviewer use
          only.
        </p>
      </div>

      {/* Video Preview */}
      {videoUrl && (
        <div className="mb-6 max-w-lg">
          <VideoPreview url={videoUrl} />
        </div>
      )}

      {videoEval ? (
        <div className="space-y-5">
          {/* TLDR + Score Header */}
          <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {videoEval.weightedScore?.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">/ 100</span>
                {videoEval.completenessFlag && (
                  <CompletenessFlag flag={videoEval.completenessFlag} />
                )}
              </div>
              {videoEval.evaluatedAt && (
                <span className="text-xs text-gray-400">
                  {new Date(videoEval.evaluatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {videoEval.tldr && (
              <p className="text-sm text-gray-700 dark:text-gray-300">{videoEval.tldr}</p>
            )}
          </div>

          {/* Criterion Scores */}
          {videoEval.scores && videoEval.scores.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Criterion Scores
              </h4>
              <div className="space-y-2">
                {videoEval.scores.map((score) => (
                  <div
                    key={score.criterionId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {score.criterionName}
                      </span>
                      <ScoreBadge score={score.score} max={score.maxScore} />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{score.reasoning}</p>
                    {score.evidence && score.evidence.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {score.evidence.map((e, i) => (
                          <p
                            key={i}
                            className="text-xs text-gray-500 dark:text-gray-500 pl-3 border-l-2 border-gray-200 dark:border-gray-700"
                          >
                            {e}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videoEval.strengths && videoEval.strengths.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
                  Strengths
                </h4>
                <ul className="space-y-1">
                  {videoEval.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-1.5">
                      <span className="text-green-500 mt-0.5 shrink-0">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {videoEval.weaknesses && videoEval.weaknesses.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">
                  Weaknesses
                </h4>
                <ul className="space-y-1">
                  {videoEval.weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-1.5">
                      <span className="text-red-500 mt-0.5 shrink-0">-</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {videoEval.recommendations && videoEval.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Recommendations
              </h4>
              <ul className="space-y-1">
                {videoEval.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-gray-700 dark:text-gray-300">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary */}
          {videoEval.summary && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Full Summary
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {videoEval.summary}
              </p>
            </div>
          )}

          {/* GitHub Insights */}
          {videoEval.githubInsights && (
            <GitHubInsightsSection insights={videoEval.githubInsights} />
          )}
        </div>
      ) : (
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
          <ClockIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No video evaluation yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Run a video evaluation to get AI-powered analysis of the demo video and repository.
          </p>
        </div>
      )}
    </div>
  );
};
