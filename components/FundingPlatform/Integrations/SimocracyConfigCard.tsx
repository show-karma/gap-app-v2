"use client";

import { ArrowPathIcon, CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import pluralize from "pluralize";
import { type FC, useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import {
  useSimocracyCouncil,
  useSimocracyProgramSummary,
  useUpdateSimocracyIntegration,
} from "@/hooks/useApplicationIntegrations";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useProgramConfig } from "@/hooks/useFundingPlatform";
import { cn } from "@/utilities/tailwind";

const gatheringUriSchema = z
  .string()
  .trim()
  .min(1, "Gathering AT-URI is required")
  .max(512, "AT-URI is too long")
  .regex(/^at:\/\//, "Must be an AT-URI starting with at://");

export interface SimocracyConfigCardProps {
  programId: string;
  /** False for reviewers — the form renders read-only. */
  canEdit: boolean;
}

const ConfigSkeleton: FC = () => (
  <div
    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 p-5 space-y-4 animate-pulse"
    data-testid="simocracy-config-loading"
  >
    <div className="flex items-center justify-between">
      <div className="h-5 w-32 rounded bg-gray-200 dark:bg-zinc-700" />
      <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-zinc-700" />
    </div>
    <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-zinc-700" />
    <div className="h-9 w-full rounded bg-gray-100 dark:bg-zinc-700" />
  </div>
);

export const SimocracyConfigCard: FC<SimocracyConfigCardProps> = ({ programId, canEdit }) => {
  const { data: program, isLoading, error, refetch } = useProgramConfig(programId);
  const updateMutation = useUpdateSimocracyIntegration(programId);
  const [, copy] = useCopyToClipboard();

  const saved = program?.applicationConfig?.integrations?.simocracy;
  const savedUri = saved?.gatheringUri ?? "";
  const savedEnabled = saved?.enabled ?? false;

  const [enabled, setEnabled] = useState(false);
  const [gatheringUri, setGatheringUri] = useState("");
  const [editingUri, setEditingUri] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Seed the form from the saved config once it arrives (and re-seed after an
  // external refetch changes it). Keyed on the saved values, not the object
  // identity, so optimistic cache writes don't wipe in-progress edits.
  useEffect(() => {
    setEnabled(savedEnabled);
    setGatheringUri(savedUri);
  }, [savedEnabled, savedUri]);

  const { data: council } = useSimocracyCouncil(programId, {
    enabled: canEdit && savedEnabled && savedUri.length > 0,
  });
  const { data: summary } = useSimocracyProgramSummary(programId, {
    enabled: savedEnabled && savedUri.length > 0,
  });

  if (isLoading) {
    return <ConfigSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 p-6 text-center">
        <p className="text-sm text-red-700 dark:text-red-400">
          Failed to load the program configuration.
        </p>
        <Button onClick={() => refetch()} className="mt-4 inline-flex items-center gap-2">
          <ArrowPathIcon className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const showUriInput = editingUri || savedUri.length === 0;
  const isRatified = summary?.decisionStatus === "ratified";

  const handleToggle = () => {
    const next = !enabled;
    setEnabled(next);
    // A configured gathering saves the flip immediately; before the first URI
    // is set there is nothing valid to persist yet — Save does it.
    if (savedUri.length > 0) {
      updateMutation.mutate({ gatheringUri: savedUri, enabled: next });
    }
  };

  const handleSave = () => {
    const parsed = gatheringUriSchema.safeParse(gatheringUri);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid AT-URI");
      return;
    }
    setValidationError(null);
    updateMutation.mutate(
      { gatheringUri: parsed.data, enabled },
      { onSuccess: () => setEditingUri(false) }
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Simocracy</h2>
          <p className="mt-0.5 max-w-[64ch] text-xs text-gray-500 dark:text-gray-400">
            Run funding rounds through a council of Sims on ATProto. When enabled, sim evaluations
            appear on each application.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle Simocracy integration"
          onClick={handleToggle}
          disabled={!canEdit || updateMutation.isPending}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:focus:ring-offset-zinc-800",
            enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-zinc-700"
          )}
        >
          <span
            className={cn(
              "pointer-events-none mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-sm transition duration-200",
              enabled ? "translate-x-[22px]" : "translate-x-[2px]"
            )}
          />
        </button>
      </div>

      {enabled && (
        <>
          {savedUri.length > 0 && (
            <div className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
              {(council?.length ?? 0) > 0 && (
                <>
                  <span className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                    <CheckIcon className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                    Gathering resolved
                  </span>
                  <span className="text-gray-300 dark:text-zinc-600">·</span>
                  <span>
                    {council?.length} {pluralize("sim", council?.length ?? 0)} in council
                  </span>
                </>
              )}
              {summary?.latestRunId && (
                <>
                  <span className="text-gray-300 dark:text-zinc-600">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    Latest run
                    {summary.decisionStatus ? (
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-px text-[11px] font-medium capitalize",
                          isRatified
                            ? "bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-gray-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        )}
                      >
                        {summary.decisionStatus}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-px text-[11px] font-medium text-gray-600 dark:bg-zinc-700 dark:text-gray-300">
                        Unpublished
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          )}

          <div className="mt-3">
            <label
              htmlFor="simocracy-gathering-uri"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300"
            >
              Gathering AT-URI
            </label>
            {showUriInput ? (
              <div className="mt-1 flex gap-2">
                <input
                  id="simocracy-gathering-uri"
                  type="text"
                  value={gatheringUri}
                  onChange={(event) => {
                    setGatheringUri(event.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={!canEdit || updateMutation.isPending}
                  placeholder="at://did:plc:…/org.simocracy.gathering/…"
                  spellCheck={false}
                  aria-invalid={!!validationError}
                  className={cn(
                    "block w-full min-w-0 flex-1 rounded-md border bg-white dark:bg-zinc-900 px-3 py-2 font-mono text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60",
                    validationError
                      ? "border-red-400 dark:border-red-700"
                      : "border-gray-200 dark:border-gray-700"
                  )}
                />
                {canEdit && (
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    isLoading={updateMutation.isPending}
                    className="shrink-0"
                  >
                    Save
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-1 flex h-[38px] items-center gap-2 rounded-md border border-gray-200 bg-gray-50 pl-3 pr-2 dark:border-gray-700 dark:bg-zinc-900/60">
                <code
                  className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[13px] text-gray-600 dark:text-gray-300"
                  title={savedUri}
                >
                  {savedUri}
                </code>
                <button
                  type="button"
                  aria-label="Copy gathering AT-URI"
                  onClick={() => copy(savedUri, "Gathering AT-URI copied")}
                  className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-zinc-700 dark:hover:text-gray-300"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditingUri(true)}
                    className="shrink-0 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
                  >
                    Change
                  </button>
                )}
              </div>
            )}
            {validationError ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                {validationError}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The Simocracy gathering this program's rounds run in.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
