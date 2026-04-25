"use client";

import type { SlackOAuthHandleCandidate } from "@/types/slack-oauth";

/**
 * Disambiguation picker rendered after a 409 ambiguous-handle response.
 * Pure presentation — the parent owns the "which one was picked" state
 * and re-submits the link request with the resolved `slackUserId`.
 */
export function SlackOauthCandidatePicker({
  candidates,
  onPick,
  isSubmitting,
}: {
  candidates: readonly SlackOAuthHandleCandidate[];
  onPick: (slackUserId: string) => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs font-medium text-stone-700 dark:text-zinc-300">
        Multiple matches — pick one:
      </p>
      <ul className="divide-y divide-stone-200 rounded-md border border-stone-200 bg-white dark:divide-zinc-800 dark:border-zinc-700 dark:bg-zinc-900">
        {candidates.map((candidate) => (
          <SlackOauthCandidateRow
            key={candidate.slackUserId}
            candidate={candidate}
            onPick={onPick}
            disabled={isSubmitting}
          />
        ))}
      </ul>
    </div>
  );
}

function SlackOauthCandidateRow({
  candidate,
  onPick,
  disabled,
}: {
  candidate: SlackOAuthHandleCandidate;
  onPick: (slackUserId: string) => void;
  disabled: boolean;
}) {
  const displayLabel = candidate.displayName || candidate.realName;
  return (
    <li className="flex items-center justify-between px-3 py-1.5 text-xs">
      <div>
        <span className="font-medium text-stone-900 dark:text-zinc-100">{displayLabel}</span>
        <span className="ml-2 text-stone-400">{candidate.slackUserId}</span>
      </div>
      <button
        type="button"
        onClick={() => onPick(candidate.slackUserId)}
        disabled={disabled}
        className="rounded-md px-2 py-0.5 text-blue-600 hover:bg-blue-50 disabled:opacity-40 dark:text-blue-400 dark:hover:bg-blue-950/30"
      >
        Pick
      </button>
    </li>
  );
}
