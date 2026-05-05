"use client";

import { ChevronDown, ChevronUp, History } from "lucide-react";
import React, { useMemo, useState } from "react";
import type { EvaluationResultResponse, EvaluationStyle } from "../schemas/session.schema";
import { useEvaluationDraftStore } from "../store/evaluationDraftStore";
import { EvaluationResultCard } from "./EvaluationResultCard";

interface IterationHistoryProps {
  sessionId: string;
  style: EvaluationStyle;
}

interface RowProps {
  result: EvaluationResultResponse;
  style: EvaluationStyle;
  highlight: boolean;
}

const HistoryRow = React.memo(function HistoryRow({ result, style, highlight }: RowProps) {
  return <EvaluationResultCard result={result} style={style} highlight={highlight} />;
});

export function IterationHistory({ sessionId, style }: IterationHistoryProps) {
  const results = useEvaluationDraftStore((s) => s.resultsBySession[sessionId] ?? []);
  const [expanded, setExpanded] = useState(true);

  const sorted = useMemo(
    () => [...results].sort((a, b) => a.iterationNumber - b.iterationNumber),
    [results]
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-medium">
          <History className="h-4 w-4" /> No iterations yet
        </p>
        <p className="mt-1 text-xs">
          Once you run an evaluation, every result is shown here so you can compare across
          iterations.
        </p>
      </div>
    );
  }

  const latestId = sorted[sorted.length - 1].id;

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <History className="h-4 w-4" /> Iteration history (
          {sorted.length === 1 ? "1 iteration" : `${sorted.length} iterations`})
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded ? (
        <div className="space-y-3">
          {sorted.map((result) => (
            <HistoryRow
              key={result.id}
              result={result}
              style={style}
              highlight={result.id === latestId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
