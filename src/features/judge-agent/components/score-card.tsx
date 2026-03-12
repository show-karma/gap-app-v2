"use client";

import React from "react";
import { cn } from "@/utilities/tailwind";
import type { CriterionScore } from "../types";

interface ScoreCardProps {
  score: CriterionScore;
}

function ScoreCardComponent({ score }: ScoreCardProps) {
  const percentage = (score.score / score.maxScore) * 100;
  const barColor =
    percentage >= 80
      ? "bg-green-500"
      : percentage >= 60
        ? "bg-yellow-500"
        : percentage >= 40
          ? "bg-orange-500"
          : "bg-red-500";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{score.criterionName}</h4>
        <span className="text-sm font-bold text-foreground">
          {score.score}/{score.maxScore}
        </span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{score.reasoning}</p>

      {score.evidence.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-muted-foreground">Evidence:</p>
          <ul className="mt-1 space-y-1">
            {score.evidence.map((e, i) => (
              <li
                key={`${score.criterionId}-evidence-${i}`}
                className="text-xs text-muted-foreground pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[6px] before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground/50"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export const ScoreCard = React.memo(ScoreCardComponent);
