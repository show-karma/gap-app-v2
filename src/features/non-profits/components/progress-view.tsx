"use client";

import { Check, Wrench, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { ChatTurn } from "../store/philanthropy";

function formatToolName(tool: string): string {
  return tool.replace(/^mcp__[^_]+__/, "").replace(/_/g, " ");
}

export function ProgressView({ progress }: { progress: NonNullable<ChatTurn["progress"]> }) {
  const { toolHistory, latestThought, matchedNames } = progress;
  const hasAnything = toolHistory.length > 0 || latestThought !== null || matchedNames.length > 0;

  if (!hasAnything) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
        <Spinner className="size-3" />
        searching 140,221 filings…
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      {toolHistory.length > 0 && (
        <ul className="flex flex-col gap-1">
          {toolHistory.map((entry, i) => (
            <li
              key={`${entry.tool}-${i}`}
              className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {entry.status === "running" && <Spinner className="size-3" />}
                {entry.status === "completed" && (
                  <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                )}
                {entry.status === "failed" && (
                  <X className="size-3 text-red-600 dark:text-red-400" />
                )}
              </span>
              <Wrench className="size-3 shrink-0 text-zinc-400" />
              <span className="font-mono">{formatToolName(entry.tool)}</span>
            </li>
          ))}
        </ul>
      )}
      {latestThought && (
        <p className="text-xs italic text-zinc-500 dark:text-zinc-400">{latestThought}</p>
      )}
      {matchedNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {matchedNames.slice(0, 12).map((name) => (
            <span
              key={name}
              className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-white dark:bg-brand/20 dark:text-brand-subtle"
            >
              {name}
            </span>
          ))}
          {matchedNames.length > 12 && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              +{matchedNames.length - 12} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
